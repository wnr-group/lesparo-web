-- AlterTable
ALTER TABLE "wholesale_enquiries" ADD COLUMN "gst_number" TEXT,
ADD COLUMN "price_list_request" BOOLEAN NOT NULL DEFAULT false;
