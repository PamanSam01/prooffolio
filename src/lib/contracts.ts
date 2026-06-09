export const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || "";
export const PROFILE_REGISTRY_ID = process.env.NEXT_PUBLIC_PROFILE_REGISTRY_ID || "";

// Module Name
export const REGISTRY_MODULE = `${PACKAGE_ID}::registry`;

// Struct Types
export const PROFILE_REGISTRY_TYPE = `${REGISTRY_MODULE}::ProfileRegistry`;
export const ORGANIZATION_TYPE = `${REGISTRY_MODULE}::Organization`;
export const CREDENTIAL_TYPE = `${REGISTRY_MODULE}::Credential`;
export const USER_PROFILE_TYPE = `${REGISTRY_MODULE}::UserProfile`;

// Event Types
export const ORGANIZATION_REGISTERED_EVENT = `${REGISTRY_MODULE}::OrganizationRegistered`;
export const PROFILE_CREATED_EVENT = `${REGISTRY_MODULE}::ProfileCreated`;
export const PROFILE_UPDATED_EVENT = `${REGISTRY_MODULE}::ProfileUpdated`;
export const CREDENTIAL_ISSUED_EVENT = `${REGISTRY_MODULE}::CredentialIssued`;
export const CREDENTIAL_SYNCED_EVENT = `${REGISTRY_MODULE}::CredentialSynced`;
export const CREDENTIAL_REVOKED_EVENT = `${REGISTRY_MODULE}::CredentialRevoked`;
