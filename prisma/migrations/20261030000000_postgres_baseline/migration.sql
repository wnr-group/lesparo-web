-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "staff_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "parent_id" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "cover_image_path" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "legacy_id" INTEGER,
    "legacy_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sku" TEXT,
    "category_id" TEXT,
    "description" TEXT,
    "specs" JSONB NOT NULL DEFAULT '[]',
    "fabric" TEXT,
    "sizes" JSONB NOT NULL DEFAULT '[]',
    "packing" TEXT,
    "quote_enabled" BOOLEAN NOT NULL DEFAULT true,
    "retail_enabled" BOOLEAN NOT NULL DEFAULT false,
    "price" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "seo_title" TEXT,
    "seo_description" TEXT,
    "legacy_id" INTEGER,
    "legacy_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "alt_text" TEXT NOT NULL DEFAULT '',
    "width" INTEGER,
    "height" INTEGER,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_content" (
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "site_content_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "wholesale_enquiries" (
    "id" TEXT NOT NULL,
    "enquiry_number" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "company_name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "country" TEXT,
    "message" TEXT NOT NULL,
    "target_budget" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "assigned_to" TEXT,
    "quotation_amount" DOUBLE PRECISION,
    "quotation_currency" TEXT,
    "quotation_valid_until" TEXT,
    "quotation_details" TEXT,
    "follow_up_at" TIMESTAMP(3),
    "follow_up_outcome" TEXT,
    "crm_record_id" TEXT,
    "crm_sync_status" TEXT NOT NULL DEFAULT 'not_configured',
    "consent_at" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'website',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wholesale_enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiry_items" (
    "id" TEXT NOT NULL,
    "enquiry_id" TEXT NOT NULL,
    "product_id" TEXT,
    "product_name_snapshot" TEXT NOT NULL,
    "quantity" INTEGER,
    "specifications" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "enquiry_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiry_attachments" (
    "id" TEXT NOT NULL,
    "enquiry_id" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enquiry_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiry_notes" (
    "id" TEXT NOT NULL,
    "enquiry_id" TEXT NOT NULL,
    "author_id" TEXT,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enquiry_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiry_status_history" (
    "id" SERIAL NOT NULL,
    "enquiry_id" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "changed_by" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enquiry_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_jobs" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_error" TEXT,
    "external_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limits" (
    "key" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key","window_start")
);

-- CreateTable
CREATE TABLE "counters" (
    "name" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "counters_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "retail_orders" (
    "id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address_line" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "notes" TEXT,
    "payment_method" TEXT NOT NULL DEFAULT 'cod',
    "payment_status" TEXT NOT NULL DEFAULT 'pending',
    "access_token" TEXT,
    "razorpay_order_id" TEXT,
    "razorpay_amount" INTEGER,
    "razorpay_payment_id" TEXT,
    "payment_verified" BOOLEAN NOT NULL DEFAULT false,
    "paid_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'new',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retail_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT,
    "product_name" TEXT NOT NULL,
    "size" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit_price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "retail_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "razorpay_order_id" TEXT NOT NULL,
    "razorpay_payment_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "method" TEXT,
    "error_code" TEXT,
    "error_description" TEXT,
    "duplicate" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "razorpay_order_id" TEXT,
    "razorpay_payment_id" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "outcome" TEXT,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_audits" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "from_value" TEXT,
    "to_value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_users_email_key" ON "staff_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "categories_legacy_id_key" ON "categories"("legacy_id");

-- CreateIndex
CREATE INDEX "categories_parent_id_display_order_idx" ON "categories"("parent_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_legacy_id_key" ON "products"("legacy_id");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_is_published_created_at_idx" ON "products"("is_published", "created_at");

-- CreateIndex
CREATE INDEX "product_images_product_id_display_order_idx" ON "product_images"("product_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "wholesale_enquiries_enquiry_number_key" ON "wholesale_enquiries"("enquiry_number");

-- CreateIndex
CREATE UNIQUE INDEX "wholesale_enquiries_idempotency_key_key" ON "wholesale_enquiries"("idempotency_key");

-- CreateIndex
CREATE INDEX "wholesale_enquiries_status_created_at_idx" ON "wholesale_enquiries"("status", "created_at");

-- CreateIndex
CREATE INDEX "wholesale_enquiries_created_at_idx" ON "wholesale_enquiries"("created_at");

-- CreateIndex
CREATE INDEX "enquiry_items_enquiry_id_display_order_idx" ON "enquiry_items"("enquiry_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "enquiry_attachments_storage_path_key" ON "enquiry_attachments"("storage_path");

-- CreateIndex
CREATE INDEX "enquiry_attachments_enquiry_id_idx" ON "enquiry_attachments"("enquiry_id");

-- CreateIndex
CREATE INDEX "enquiry_notes_enquiry_id_created_at_idx" ON "enquiry_notes"("enquiry_id", "created_at");

-- CreateIndex
CREATE INDEX "enquiry_status_history_enquiry_id_changed_at_idx" ON "enquiry_status_history"("enquiry_id", "changed_at");

-- CreateIndex
CREATE UNIQUE INDEX "integration_jobs_idempotency_key_key" ON "integration_jobs"("idempotency_key");

-- CreateIndex
CREATE INDEX "integration_jobs_status_next_attempt_at_idx" ON "integration_jobs"("status", "next_attempt_at");

-- CreateIndex
CREATE INDEX "integration_jobs_entity_type_entity_id_idx" ON "integration_jobs"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "retail_orders_order_number_key" ON "retail_orders"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "retail_orders_idempotency_key_key" ON "retail_orders"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "retail_orders_access_token_key" ON "retail_orders"("access_token");

-- CreateIndex
CREATE UNIQUE INDEX "retail_orders_razorpay_order_id_key" ON "retail_orders"("razorpay_order_id");

-- CreateIndex
CREATE INDEX "retail_orders_status_created_at_idx" ON "retail_orders"("status", "created_at");

-- CreateIndex
CREATE INDEX "retail_order_items_order_id_idx" ON "retail_order_items"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpay_payment_id_key" ON "payments"("razorpay_payment_id");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_event_id_key" ON "payment_events"("event_id");

-- CreateIndex
CREATE INDEX "order_audits_order_id_created_at_idx" ON "order_audits"("order_id", "created_at");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiry_items" ADD CONSTRAINT "enquiry_items_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "wholesale_enquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiry_items" ADD CONSTRAINT "enquiry_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiry_attachments" ADD CONSTRAINT "enquiry_attachments_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "wholesale_enquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiry_notes" ADD CONSTRAINT "enquiry_notes_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "wholesale_enquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiry_status_history" ADD CONSTRAINT "enquiry_status_history_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "wholesale_enquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_order_items" ADD CONSTRAINT "retail_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "retail_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_order_items" ADD CONSTRAINT "retail_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "retail_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_audits" ADD CONSTRAINT "order_audits_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "retail_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

