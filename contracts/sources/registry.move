module prooffolio::registry {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::dynamic_field;
    use sui::clock::{Self, Clock};
    use std::string::{String};
    use std::vector;

    // --- Error Codes ---
    const E_PROFILE_EXISTS: u64 = 0;
    const E_NOT_OWNER: u64 = 1;
    const E_NOT_RECIPIENT: u64 = 2;
    const E_CREDENTIAL_REVOKED: u64 = 3;
    const E_ALREADY_SYNCED: u64 = 4;
    const E_INVALID_ORG: u64 = 5;
    const E_ORG_NOT_VERIFIED: u64 = 6;

    // --- Core Registry ---

    /// Shared object to enforce 1-Profile-Per-Wallet globally.
    struct ProfileRegistry has key {
        id: UID,
        total_profiles: u64,
    }

    struct Organization has key, store {
        id: UID,
        owner: address,
        name: String,
        website: String,
        description: String,
        logo_blob_id: String,
        org_type: String,
        is_verified: bool, // Protocol-level verification flag
        created_at: u64,
    }

    struct Credential has key, store {
        id: UID,
        recipient: address,
        issuer: address,
        org_id: ID,
        title: String,
        metadata_blob_id: String, // Walrus Blob ID for certificates
        tags: vector<String>,     // For AI Indexing
        weight: u64,              // Reputation impact (0-1000)
        issued_at: u64,
        revoked: bool,
    }

    struct UserProfile has key, store {
        id: UID,
        owner: address,
        display_name: String,
        bio: String,
        avatar_blob_id: String,
        resume_blob_id: String,
        skills: vector<String>,
        base_reputation: u64,
        verified_weight: u64,
        credential_count: u64,
        synced_creds: vector<ID>,
        unique_issuers: vector<address>,
        created_at: u64,
    }

    // --- Events (Optimized for AI Indexing) ---

    struct OrganizationRegistered has copy, drop {
        org_id: ID,
        owner: address,
        name: String,
        website: String,
        org_type: String,
    }

    struct OrganizationUpdated has copy, drop {
        org_id: ID,
        owner: address,
    }

    struct ProfileCreated has copy, drop {
        profile_id: ID,
        owner: address,
        display_name: String,
        created_at: u64,
    }

    struct ProfileUpdated has copy, drop {
        profile_id: ID,
        owner: address,
    }

    struct CredentialIssued has copy, drop {
        cred_id: ID,
        recipient: address,
        issuer: address,
        org_id: ID,
        title: String,
        tags: vector<String>,
        weight: u64,
    }

    struct CredentialSynced has copy, drop {
        profile_id: ID,
        cred_id: ID,
        owner: address,
        issuer: address,
        added_weight: u64,
        new_total_weight: u64,
    }

    struct CredentialRevoked has copy, drop {
        cred_id: ID,
        issuer: address,
    }

    // --- Initialization ---

    struct AdminCap has key, store { id: UID }

    fun init(ctx: &mut TxContext) {
        transfer::transfer(AdminCap { id: object::new(ctx) }, tx_context::sender(ctx));
        
        transfer::share_object(ProfileRegistry {
            id: object::new(ctx),
            total_profiles: 0,
        });
    }

    // --- Functions: Organization ---

    public entry fun register_organization(
        name: String, 
        website: String,
        description: String,
        logo_blob_id: String,
        org_type: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let id = object::new(ctx);
        let org_id = object::uid_to_inner(&id);

        let org = Organization {
            id,
            owner: sender,
            name,
            website,
            description,
            logo_blob_id,
            org_type,
            is_verified: false, // Default to unverified
            created_at: clock::timestamp_ms(clock),
        };

        event::emit(OrganizationRegistered {
            org_id,
            owner: sender,
            name: org.name,
            website: org.website,
            org_type: org.org_type,
        });

        transfer::transfer(org, sender);
    }

    public entry fun update_organization(
        org: &mut Organization,
        name: String, 
        website: String,
        description: String,
        logo_blob_id: String,
        org_type: String,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == org.owner, E_NOT_OWNER); // Not owner

        org.name = name;
        org.website = website;
        org.description = description;
        org.logo_blob_id = logo_blob_id;
        org.org_type = org_type;

        event::emit(OrganizationUpdated {
            org_id: object::id(org),
            owner: org.owner,
        });
    }

    public entry fun verify_organization(
        _: &AdminCap,
        org: &mut Organization,
        _ctx: &mut TxContext
    ) {
        org.is_verified = true;
    }

    // --- Functions: Profile Management ---

    /// Mints a new UserProfile. Enforces 1-Profile-Per-Wallet using ProfileRegistry.
    public entry fun mint_profile(
        registry: &mut ProfileRegistry,
        display_name: String,
        bio: String,
        avatar_blob_id: String,
        resume_blob_id: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Ensure user doesn't already have a profile in the registry
        assert!(!dynamic_field::exists(&registry.id, sender), E_PROFILE_EXISTS);

        let id = object::new(ctx);
        let profile_id = object::uid_to_inner(&id);
        let current_time = clock::timestamp_ms(clock);

        let profile = UserProfile {
            id,
            owner: sender,
            display_name,
            bio,
            avatar_blob_id,
            resume_blob_id,
            skills: vector[],
            base_reputation: 100, // Base starting score
            verified_weight: 0,
            credential_count: 0,
            synced_creds: vector[],
            unique_issuers: vector[],
            created_at: current_time,
        };

        // Add to registry to prevent multiple profiles
        dynamic_field::add(&mut registry.id, sender, profile_id);
        registry.total_profiles = registry.total_profiles + 1;

        event::emit(ProfileCreated {
            profile_id,
            owner: sender,
            display_name: profile.display_name,
            created_at: current_time,
        });

        transfer::transfer(profile, sender);
    }

    public entry fun update_profile(
        profile: &mut UserProfile,
        display_name: String,
        bio: String,
        avatar_blob_id: String,
        resume_blob_id: String,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == profile.owner, E_NOT_OWNER);

        profile.display_name = display_name;
        profile.bio = bio;
        profile.avatar_blob_id = avatar_blob_id;
        profile.resume_blob_id = resume_blob_id;

        event::emit(ProfileUpdated {
            profile_id: object::id(profile),
            owner: profile.owner,
        });
    }

    // --- Functions: Credential issuance & sync ---

    public entry fun issue_weighted_credential(
        org: &Organization,
        recipient: address,
        title: String,
        metadata_blob_id: String,
        tags: vector<String>,
        weight: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == org.owner, E_NOT_OWNER);

        let id = object::new(ctx);
        let cred_id = object::uid_to_inner(&id);
        let org_id = object::id(org);
        let issued_at = clock::timestamp_ms(clock);

        let cred = Credential {
            id,
            recipient,
            issuer: org.owner,
            org_id,
            title,
            metadata_blob_id,
            tags,
            weight,
            issued_at,
            revoked: false,
        };

        event::emit(CredentialIssued {
            cred_id,
            recipient,
            issuer: org.owner,
            org_id,
            title: cred.title,
            tags: cred.tags,
            weight,
        });

        transfer::transfer(cred, recipient);
    }

    public entry fun sync_credential(
        profile: &mut UserProfile,
        cred: &Credential,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == profile.owner, E_NOT_OWNER);
        assert!(cred.recipient == profile.owner, E_NOT_RECIPIENT); // Must be the recipient
        assert!(!cred.revoked, E_CREDENTIAL_REVOKED); // Must not be revoked

        let cred_id = object::id(cred);
        assert!(!vector::contains(&profile.synced_creds, &cred_id), E_ALREADY_SYNCED); // Prevent double counting

        // Add to synced creds
        vector::push_back(&mut profile.synced_creds, cred_id);
        
        // Track unique issuers
        if (!vector::contains(&profile.unique_issuers, &cred.issuer)) {
            vector::push_back(&mut profile.unique_issuers, cred.issuer);
        };

        // Update Reputation
        profile.credential_count = profile.credential_count + 1;
        profile.verified_weight = profile.verified_weight + cred.weight;

        // Also add tags to profile skills if they don't exist
        let i = 0;
        let len = vector::length(&cred.tags);
        while (i < len) {
            let tag = *vector::borrow(&cred.tags, i);
            if (!vector::contains(&profile.skills, &tag)) {
                vector::push_back(&mut profile.skills, tag);
            };
            i = i + 1;
        };

        event::emit(CredentialSynced {
            profile_id: object::id(profile),
            cred_id,
            owner: profile.owner,
            issuer: cred.issuer,
            added_weight: cred.weight,
            new_total_weight: profile.verified_weight,
        });
    }

    public entry fun revoke_credential(
        org: &Organization,
        cred: &mut Credential,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == org.owner, E_NOT_OWNER);
        assert!(cred.org_id == object::id(org), E_INVALID_ORG); // Must be issued by this org
        
        cred.revoked = true;

        event::emit(CredentialRevoked {
            cred_id: object::id(cred),
            issuer: org.owner,
        });
    }

    // --- Accessors ---

    public fun is_revoked(cred: &Credential): bool {
        cred.revoked
    }
}
