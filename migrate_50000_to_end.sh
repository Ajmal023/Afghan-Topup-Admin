#!/bin/bash
# migrate_50000_to_end.sh

DB_USER="root"
DB_PASS="AfghanTopup@512"
OLD_DB="afghan_topup"
NEW_DB="AF_TOPUP_DB"
BACKUP_FILE="new_transactions_backup_$(date +%Y%m%d_%H%M).sql"
START_ID=50000
END_ID=273348

echo "🎯 COMPLETE MIGRATION: IDs $START_ID to $END_ID"
echo "📊 Total range: $((END_ID - START_ID + 1)) transactions"

echo "🔒 STEP 1: Backing up current transactions in new database..."
mysqldump -u $DB_USER -p$DB_PASS $NEW_DB transactions > $BACKUP_FILE
echo "Backup created: $BACKUP_FILE"

echo "🔍 STEP 2: Checking current data in NEW database..."
mysql -u $DB_USER -p$DB_PASS $NEW_DB -e "
SELECT 
    COUNT(*) as current_transactions,
    MIN(id) as min_id,
    MAX(id) as max_id,
    COUNT(CASE WHEN is_checked = 1 THEN 1 END) as already_checked,
    COUNT(CASE WHEN is_checked = 0 THEN 1 END) as not_checked
FROM transactions;"

echo "🔍 STEP 3: Checking target data in OLD database..."
mysql -u $DB_USER -p$DB_PASS $OLD_DB -e "
SELECT 
    COUNT(*) as total_in_range,
    COUNT(CASE WHEN status IN ('Paid','Confirmed','Rejected') THEN 1 END) as successful_in_range,
    MIN(created_at) as oldest_date,
    MAX(created_at) as newest_date
FROM transactions 
WHERE id BETWEEN $START_ID AND $END_ID;"

echo "🚀 STEP 4: Starting COMPLETE migration..."

# Larger chunk size since we're doing more data
CHUNK_SIZE=5000
TOTAL_IMPORTED=0
TOTAL_CHUNKS=$(( (END_ID - START_ID + CHUNK_SIZE) / CHUNK_SIZE ))
CHUNK_COUNT=0

for ((start_id=START_ID; start_id<=END_ID; start_id=start_id+CHUNK_SIZE)); do
    chunk_end=$((start_id + CHUNK_SIZE - 1))
    if [ $chunk_end -gt $END_ID ]; then
        chunk_end=$END_ID
    fi
    
    CHUNK_COUNT=$((CHUNK_COUNT + 1))
    echo "🔄 Chunk $CHUNK_COUNT/$TOTAL_CHUNKS: Processing IDs $start_id to $chunk_end..."
    
    # Use INSERT IGNORE to safely handle any duplicate IDs
    mysql -u $DB_USER -p$DB_PASS $NEW_DB -e "
    INSERT IGNORE INTO transactions (
        id, amount, value, phone_number, network, uid, payment_id,
        original_amount, discount_amount, promo_code, promo_code_id,
        status, output, stripe_status, currency, is_checked, createdAt, updatedAt
    )
    SELECT 
        id,
        CAST(COALESCE(NULLIF(TRIM(amount), ''), '0') AS DECIMAL(10,2)) as amount,
        CAST(COALESCE(NULLIF(TRIM(value), ''), '0') AS DECIMAL(10,2)) as value,
        COALESCE(NULLIF(TRIM(phone_number), ''), 'Unknown') as phone_number,
        COALESCE(NULLIF(TRIM(network), ''), 'Afghan Network') as network,
        COALESCE(NULLIF(TRIM(uid), ''), 'legacy_user') as uid,
        COALESCE(NULLIF(TRIM(payment_id), ''), 'legacy_import') as payment_id,
        CAST(COALESCE(NULLIF(TRIM(amount), ''), '0') AS DECIMAL(10,2)) as original_amount,
        0.00 as discount_amount,
        '' as promo_code,
        NULL as promo_code_id,
        CASE 
            WHEN status IN ('Pending','Paid','Confirmed','Rejected','failed') THEN status
            ELSE 'Pending'
        END as status,
        CAST(COALESCE(NULLIF(TRIM(output), ''), '1') AS UNSIGNED) as output,
        COALESCE(NULLIF(TRIM(stripe_status), ''), 'succeeded') as stripe_status,
        COALESCE(NULLIF(TRIM(currency), ''), 'USD') as currency,
        1 as is_checked,
        COALESCE(created_at, NOW()) as createdAt,
        COALESCE(updated_at, NOW()) as updatedAt
    FROM $OLD_DB.transactions 
    WHERE id BETWEEN $start_id AND $chunk_end
    AND status IN ('Paid', 'Confirmed', 'Rejected');"

    COUNT_IMPORTED=$(mysql -u $DB_USER -p$DB_PASS $NEW_DB -N -e "SELECT ROW_COUNT();")
    echo "  ✅ Imported $COUNT_IMPORTED records from chunk $start_id-$chunk_end"
    TOTAL_IMPORTED=$((TOTAL_IMPORTED + COUNT_IMPORTED))
    
    # Progress percentage
    PROGRESS=$(( (start_id - START_ID) * 100 / (END_ID - START_ID) ))
    REMAINING=$((TOTAL_CHUNKS - CHUNK_COUNT))
    echo "  📈 Progress: $PROGRESS% completed | Remaining chunks: $REMAINING"
    
    # Small delay to avoid overwhelming the database
    sleep 1
done

echo "✅ STEP 5: Migration completed!"
echo "📊 STEP 6: Final verification..."

mysql -u $DB_USER -p$DB_PASS $NEW_DB -e "
SELECT 
    COUNT(*) as total_transactions_after,
    COUNT(CASE WHEN id BETWEEN $START_ID AND $END_ID AND is_checked = 1 THEN 1 END) as imported_target_transactions,
    COUNT(CASE WHEN id BETWEEN $START_ID AND $END_ID THEN 1 END) as total_in_target_range,
    MIN(id) as smallest_id,
    MAX(id) as largest_id,
    MIN(createdAt) as earliest_date,
    MAX(createdAt) as latest_date
FROM transactions;"

echo ""
echo "🎯 COMPLETE MIGRATION SUMMARY:"
echo "=============================="
echo "📁 Backup file: $BACKUP_FILE"
echo "🎯 Target range: IDs $START_ID to $END_ID"
echo "📊 Total imported: $TOTAL_IMPORTED records"
echo "🔄 Total chunks processed: $CHUNK_COUNT"
echo "✅ All imported transactions marked as is_checked = 1"
echo "🛡️ Original dates preserved (createdAt, updatedAt)"

echo ""
echo "🔧 RECOVERY COMMAND (if needed):"
echo "mysql -u $DB_USER -p$DB_PASS $NEW_DB < $BACKUP_FILE"

echo ""
echo "💡 FINAL VERIFICATION COMMANDS:"
echo "mysql -u $DB_USER -p$DB_PASS $NEW_DB -e \"SELECT COUNT(*) as total_final_count FROM transactions;\""
echo "mysql -u $DB_USER -p$DB_PASS $NEW_DB -e \"SELECT COUNT(*) as checked_count FROM transactions WHERE is_checked = 1;\""
