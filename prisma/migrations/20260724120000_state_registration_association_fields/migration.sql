-- AlterTable
ALTER TABLE "StateRegistration" ADD COLUMN     "associationName" TEXT,
ADD COLUMN     "associationOfficeAddress" TEXT,
ADD COLUMN     "associationOfficialContactNumber" TEXT,
ADD COLUMN     "associationRegisterNumber" TEXT,
ADD COLUMN     "addressProofUrl" TEXT,
ADD COLUMN     "associationCertificateUrl" TEXT,
ADD COLUMN     "associationOfficeAddressProofUrl" TEXT,
ADD COLUMN     "associationDeclarationUrl" TEXT;
