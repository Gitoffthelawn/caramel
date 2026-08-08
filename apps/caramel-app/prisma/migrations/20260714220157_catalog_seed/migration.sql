-- SYNTHETIC SAMPLE DATA — NOT real scraped catalog (secrecy boundary). See DESIGN §2.
--
-- W3a catalog seed. Runs via `prisma migrate deploy` (CI + compose + the
-- clean-volume proof) so a fresh app DB has meaningful coupon/store/source data
-- for W4's reads WITHOUT any dependency on the external Python-owned
-- caramel_coupons DB. Every value here is INVENTED (hand-authored), never copied
-- from the real scraped catalog — the real selectors, coupon rows and source
-- lists stay owned by the pipeline and are never committed to this repo.
--
-- Determinism + idempotency (clean-volume-safe, re-runnable):
--   * Coupon ids are an obviously-synthetic '9000000xx' range that does NOT
--     overlap the trust-loop tests' '999000xxx' fixtures.
--   * created_at / updated_at / last_time_used are FIXED past timestamps (no
--     now()), so counts/ordering are identical on every fresh apply.
--   * ON CONFLICT DO NOTHING on each primary key — re-applying is a no-op.
--   * status values are real VISIBLE + non-visible statuses from
--     src/lib/coupons.ts STATUS_TABLE (valid / valid_with_warning /
--     product_restriction / category_restricted / seller_specific / pending /
--     retry are visible; invalid / expired are not) so W4's visible-status
--     filter, ranking (rating DESC, created_at DESC) and the verified census
--     all have exercisable data — including expired=true rows and a
--     null-discount_type / null-expiry pending slice.

-- 30 coupons across the 3 demo stores (ebay.com / amazon.com / codecademy.com)
-- plus walmart.com + target.com.
INSERT INTO "public"."coupons" (
    "id", "code", "site", "title", "description", "rating",
    "discount_type", "discount_amount", "expiry", "expired",
    "times_used", "last_time_used", "status", "verification_message",
    "created_at", "updated_at"
) VALUES
 ('900000001','SAVE10NOW','ebay.com','10% off electronics','Get 10% off select electronics at checkout.',4.6,'PERCENTAGE',10,'2026-12-31',false,152,'2026-07-10 14:22:00','valid','Verified working on 2026-07-10','2026-06-01 12:00:00','2026-07-10 14:22:00'),
 ('900000002','FREESHIP','ebay.com','Free shipping over $25','Free standard shipping on orders over $25.',4.1,'CASH',5,'2026-11-15',false,89,'2026-07-08 09:10:00','valid_with_warning','Works on most sellers; some exclusions','2026-06-02 12:00:00','2026-07-08 09:10:00'),
 ('900000003','EXTRA15','ebay.com','15% off with promo','Extra 15% off selected refurbished items.',3.8,'PERCENTAGE',15,NULL,false,34,NULL,'pending',NULL,'2026-06-03 12:00:00','2026-06-03 12:00:00'),
 ('900000004','DEAL20','ebay.com','$20 off $100','Take $20 off when you spend $100 or more.',4.3,'fixed',20,'2026-09-30',false,210,'2026-07-11 18:05:00','product_restriction','Applies to eligible categories only','2026-06-04 12:00:00','2026-07-11 18:05:00'),
 ('900000005','OLDCODE','ebay.com','Expired seasonal code','Past promotion, no longer active.',2.2,'PERCENTAGE',25,'2026-07-05',true,500,'2026-07-01 12:00:00','expired','Expired 2026-07-05','2026-06-05 12:00:00','2026-07-05 00:00:00'),
 ('900000006','SELLERX','ebay.com','Seller-specific 12% off','12% off from a specific top-rated seller.',3.9,'PERCENTAGE',12,'2026-10-20',false,5,NULL,'seller_specific','Valid for one seller storefront','2026-06-06 12:00:00','2026-06-06 12:00:00'),
 ('900000007','CATLIMIT','ebay.com','Category-limited discount','8% off home and garden category.',3.5,'PERCENTAGE',8,NULL,false,12,NULL,'category_restricted',NULL,'2026-06-07 12:00:00','2026-06-07 12:00:00'),
 ('900000008','DEADCODE','ebay.com','Invalid test code','Reported not working by users.',1.1,'CASH',3,NULL,false,0,NULL,'invalid','Failed verification','2026-06-08 12:00:00','2026-06-08 12:00:00'),
 ('900000009','PRIME5','amazon.com','$5 off first order','New customers save $5 on first eligible order.',4.8,'CASH',5,'2026-12-01',false,320,'2026-07-12 08:00:00','valid','Verified working on 2026-07-12','2026-06-09 12:00:00','2026-07-12 08:00:00'),
 ('900000010','BOOKS10','amazon.com','10% off books','Save 10% on select print books.',4.0,'PERCENTAGE',10,'2026-08-31',false,74,'2026-07-05 16:40:00','valid','Verified working','2026-06-10 12:00:00','2026-07-05 16:40:00'),
 ('900000011','HOME25','amazon.com','$25 off home goods','$25 off when you spend $150 on home goods.',4.4,'fixed',25,'2026-11-30',false,143,'2026-07-09 11:15:00','product_restriction','Home and kitchen only','2026-06-11 12:00:00','2026-07-09 11:15:00'),
 ('900000012','TRYRETRY','amazon.com','Rechecking discount','Discount is being re-verified.',3.2,'PERCENTAGE',7,NULL,false,18,NULL,'retry',NULL,'2026-06-12 12:00:00','2026-06-12 12:00:00'),
 ('900000013','WARN15','amazon.com','15% off - may vary','15% off, final amount may vary by item.',3.7,'PERCENTAGE',15,'2026-10-10',false,61,'2026-07-01 10:00:00','valid_with_warning','Cap of $30 discount','2026-06-13 12:00:00','2026-07-01 10:00:00'),
 ('900000014','PENDINGA','amazon.com','Unverified 20% off','Newly scraped, not yet verified.',0,NULL,NULL,NULL,false,2,NULL,'pending',NULL,'2026-06-14 12:00:00','2026-06-14 12:00:00'),
 ('900000015','EXPD30','amazon.com','Expired 30% code','Old holiday code, expired.',2.9,'PERCENTAGE',30,'2026-07-08',true,640,'2026-07-02 12:00:00','expired','Expired 2026-07-08','2026-06-15 12:00:00','2026-07-08 00:00:00'),
 ('900000016','CASHBACK8','amazon.com','$8 cashback','Get $8 back on qualifying purchase.',4.2,'CASH',8,'2026-09-01',false,97,'2026-07-06 13:30:00','valid','Verified working','2026-06-16 12:00:00','2026-07-06 13:30:00'),
 ('900000017','LEARN40','codecademy.com','40% off Pro annual','Save 40% on a Codecademy Pro annual plan.',4.9,'PERCENTAGE',40,'2026-12-31',false,415,'2026-07-13 07:45:00','valid','Verified working on 2026-07-13','2026-06-17 12:00:00','2026-07-13 07:45:00'),
 ('900000018','STUDENT20','codecademy.com','20% student discount','Extra 20% off for verified students.',4.5,'PERCENTAGE',20,'2026-10-31',false,128,'2026-07-04 19:20:00','valid_with_warning','Requires student verification','2026-06-18 12:00:00','2026-07-04 19:20:00'),
 ('900000019','PROMO7','codecademy.com','$7 off monthly','$7 off your first month of Pro.',3.6,'fixed',7,NULL,false,22,NULL,'pending',NULL,'2026-06-19 12:00:00','2026-06-19 12:00:00'),
 ('900000020','CATLEARN','codecademy.com','Career path discount','10% off career path bundles only.',3.9,'PERCENTAGE',10,'2026-09-15',false,40,'2026-06-28 09:00:00','category_restricted','Career paths only','2026-06-20 12:00:00','2026-06-28 09:00:00'),
 ('900000021','RETRYCC','codecademy.com','Re-checking Pro code','Being re-verified after a transient failure.',3.0,'PERCENTAGE',25,NULL,false,9,NULL,'retry',NULL,'2026-06-21 12:00:00','2026-06-21 12:00:00'),
 ('900000022','DEADCC','codecademy.com','Invalid promo','No longer accepted at checkout.',1.4,'PERCENTAGE',50,NULL,false,3,NULL,'invalid','Failed verification','2026-06-22 12:00:00','2026-06-22 12:00:00'),
 ('900000023','WALMART10','walmart.com','$10 off $50','$10 off orders of $50 or more.',4.3,'fixed',10,'2026-11-01',false,176,'2026-07-07 15:10:00','valid','Verified working','2026-06-23 12:00:00','2026-07-07 15:10:00'),
 ('900000024','GROCERY5','walmart.com','5% off groceries','5% off select grocery items.',0,NULL,NULL,NULL,false,51,NULL,'pending',NULL,'2026-06-24 12:00:00','2026-06-24 12:00:00'),
 ('900000025','WMWARN','walmart.com','$15 off - exclusions','$15 off, some items excluded.',3.5,'CASH',15,'2026-08-20',false,33,'2026-06-30 12:00:00','valid_with_warning','Grocery excluded','2026-06-25 12:00:00','2026-06-30 12:00:00'),
 ('900000026','WMEXP','walmart.com','Expired rollback code','Past rollback event, expired.',2.5,'PERCENTAGE',12,'2026-07-10',true,300,'2026-07-03 12:00:00','expired','Expired 2026-07-10','2026-06-26 12:00:00','2026-07-10 00:00:00'),
 ('900000027','TARGET20','target.com','20% off apparel','20% off select apparel and accessories.',4.6,'PERCENTAGE',20,'2026-10-05',false,205,'2026-07-11 09:30:00','valid','Verified working','2026-06-27 12:00:00','2026-07-11 09:30:00'),
 ('900000028','CIRCLE5','target.com','$5 Target Circle bonus','$5 bonus with Target Circle offer.',4.0,'CASH',5,'2026-09-20',false,88,'2026-07-02 14:00:00','seller_specific','Requires Target Circle','2026-06-28 12:00:00','2026-07-02 14:00:00'),
 ('900000029','REDCARD','target.com','Extra 5% off','Additional 5% off with RedCard.',3.7,'PERCENTAGE',5,NULL,false,27,NULL,'product_restriction','RedCard holders','2026-06-29 12:00:00','2026-06-29 12:00:00'),
 ('900000030','TGTPEND','target.com','Unverified $18 off','Scraped offer awaiting verification.',0,'fixed',18,NULL,false,1,NULL,'pending',NULL,'2026-06-30 12:00:00','2026-06-30 12:00:00')
ON CONFLICT ("id") DO NOTHING;

-- 3 flattened store_configs for the demo stores. XPaths are SYNTHETIC (invented
-- selector shapes), never the real scraped selectors. codecademy.com leaves the
-- two optional xpaths NULL to exercise the nullable columns.
INSERT INTO "public"."store_configs" (
    "store_name", "show_input_xpath", "dismiss_button_xpath", "coupon_input_xpath",
    "apply_button_xpath", "price_container_xpath", "success_indicator_xpath",
    "error_indicator_xpath", "coupon_remove_xpath", "updated_at", "created_at"
) VALUES
 ('ebay.com','//button[@data-test="promo-toggle"]','//button[@aria-label="close-banner"]','//input[@id="promo-code"]','//button[@data-test="apply-promo"]','//span[@data-test="order-total"]','//div[@data-test="promo-success"]','//div[@data-test="promo-error"]','//button[@data-test="remove-promo"]','2026-06-10 12:00:00','2026-06-01 12:00:00'),
 ('amazon.com','//div[@id="promo-toggle-link"]','//input[@id="promoCancel"]','//input[@id="promoCode"]','//span[@id="promoApply"]//input','//td[@class="grand-total-price"]','//div[@id="promo-applied-msg"]','//div[@id="promo-error-msg"]','//a[@id="promo-remove-link"]','2026-06-11 12:00:00','2026-06-02 12:00:00'),
 ('codecademy.com','//button[@data-testid="add-coupon"]',NULL,'//input[@name="couponCode"]','//button[@data-testid="apply-coupon"]','//div[@data-testid="summary-total"]','//div[@data-testid="coupon-success"]','//div[@data-testid="coupon-error"]',NULL,'2026-06-12 12:00:00','2026-06-03 12:00:00')
ON CONFLICT ("store_name") DO NOTHING;

-- 3 sources. websites[] overlaps the seeded coupons' `site` so W4's
-- listActiveSources LEFT JOIN aggregates are non-zero. 2 ACTIVE + 1 REQUESTED.
INSERT INTO "public"."sources" (
    "id", "source", "websites", "status", "created_at", "updated_at"
) VALUES
 ('seed-source-001','Caramel Sample Feed A',ARRAY['ebay.com','amazon.com'],'ACTIVE','2026-06-01 12:00:00','2026-06-05 12:00:00'),
 ('seed-source-002','Caramel Sample Feed B',ARRAY['codecademy.com'],'ACTIVE','2026-06-02 12:00:00','2026-06-06 12:00:00'),
 ('seed-source-003','Caramel Sample Feed C',ARRAY['walmart.com','target.com'],'REQUESTED','2026-06-03 12:00:00','2026-06-07 12:00:00')
ON CONFLICT ("id") DO NOTHING;
