-- Seed all Indian states and UTs (36 rows).
-- isEnabled = true for northwest / pilot belt (CH, DL, GJ, HP, HR, JK, LA, PB, RJ); false for all others.
-- Districts: sample real district names per state; isEnabled chosen with random() per row at apply time.

INSERT INTO "State" ("id", "name", "code", "isEnabled", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'Andhra Pradesh', 'AP', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'Arunachal Pradesh', 'AR', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'Assam', 'AS', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'Bihar', 'BR', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'Chhattisgarh', 'CG', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'Goa', 'GA', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'Gujarat', 'GJ', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'Haryana', 'HR', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'Himachal Pradesh', 'HP', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'Jharkhand', 'JH', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'Karnataka', 'KA', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'Kerala', 'KL', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'Madhya Pradesh', 'MP', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'Maharashtra', 'MH', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'Manipur', 'MN', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'Meghalaya', 'ML', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'Mizoram', 'MZ', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'Nagaland', 'NL', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'Odisha', 'OD', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'Punjab', 'PB', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'Rajasthan', 'RJ', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'Sikkim', 'SK', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'Tamil Nadu', 'TN', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'Telangana', 'TS', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'Tripura', 'TR', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'Uttarakhand', 'UK', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'Uttar Pradesh', 'UP', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'West Bengal', 'WB', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'Andaman and Nicobar Islands', 'AN', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'Chandigarh', 'CH', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'Dadra and Nagar Haveli and Daman and Diu', 'DD', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'Delhi', 'DL', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'Jammu and Kashmir', 'JK', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'Ladakh', 'LA', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'Lakshadweep', 'LD', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'Puducherry', 'PY', false, NOW(), NOW())
ON CONFLICT ("code") DO UPDATE SET
  "isEnabled" = EXCLUDED."isEnabled",
  "name" = EXCLUDED."name",
  "updatedAt" = NOW();


INSERT INTO "District" ("id", "stateId", "name", "isEnabled", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, s.id, 'Visakhapatnam', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'AP'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Guntur', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'AP'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Kurnool', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'AP'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Papum Pare', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'AR'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Itanagar', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'AR'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Tawang', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'AR'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Kamrup Metropolitan', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'AS'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Dibrugarh', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'AS'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Jorhat', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'AS'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Patna', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'BR'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Gaya', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'BR'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Muzaffarpur', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'BR'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Raipur', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'CG'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Bilaspur', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'CG'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Durg', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'CG'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'North Goa', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'GA'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'South Goa', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'GA'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Dharbandora', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'GA'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Ahmedabad', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'GJ'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Surat', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'GJ'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Vadodara', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'GJ'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Ambala', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'HR'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Gurugram', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'HR'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Faridabad', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'HR'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Shimla', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'HP'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Kangra', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'HP'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Mandi', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'HP'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Ranchi', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'JH'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'East Singhbhum', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'JH'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Dhanbad', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'JH'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Bengaluru Urban', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'KA'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Mysuru', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'KA'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Belagavi', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'KA'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Ernakulam', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'KL'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Thiruvananthapuram', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'KL'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Kozhikode', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'KL'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Indore', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'MP'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Bhopal', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'MP'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Jabalpur', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'MP'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Mumbai City', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'MH'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Pune', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'MH'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Nagpur', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'MH'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Imphal East', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'MN'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Imphal West', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'MN'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Thoubal', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'MN'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'East Khasi Hills', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'ML'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'West Jaintia Hills', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'ML'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Ri-Bhoi', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'ML'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Aizawl', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'MZ'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Lunglei', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'MZ'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Champhai', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'MZ'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Kohima', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'NL'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Dimapur', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'NL'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Mokokchung', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'NL'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Khordha', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'OD'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Cuttack', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'OD'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Ganjam', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'OD'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Amritsar', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'PB'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Ludhiana', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'PB'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Patiala', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'PB'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Jaipur', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'RJ'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Jodhpur', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'RJ'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Udaipur', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'RJ'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Gangtok', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'SK'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Namchi', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'SK'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Pakyong', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'SK'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Chennai', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'TN'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Coimbatore', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'TN'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Madurai', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'TN'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Hyderabad', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'TS'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Warangal', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'TS'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Karimnagar', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'TS'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'West Tripura', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'TR'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Sepahijala', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'TR'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Unakoti', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'TR'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Dehradun', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'UK'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Nainital', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'UK'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Haridwar', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'UK'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Lucknow', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'UP'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Kanpur Nagar', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'UP'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Varanasi', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'UP'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Kolkata', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'WB'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Howrah', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'WB'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'North 24 Parganas', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'WB'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Nicobar', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'AN'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'North and Middle Andaman', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'AN'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'South Andaman', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'AN'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Chandigarh', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'CH'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Dadra and Nagar Haveli', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'DD'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Daman', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'DD'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Diu', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'DD'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Central Delhi', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'DL'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'New Delhi', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'DL'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Shahdara', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'DL'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Srinagar', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'JK'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Jammu', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'JK'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Anantnag', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'JK'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Leh', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'LA'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Kargil', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'LA'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Kavaratti', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'LD'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Minicoy', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'LD'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Andrott', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'LD'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Puducherry', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'PY'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Karaikal', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'PY'
UNION ALL
SELECT gen_random_uuid()::text, s.id, 'Yanam', (random() < 0.5), NOW(), NOW() FROM "State" s WHERE s.code = 'PY'
ON CONFLICT ("stateId", "name") DO UPDATE SET
  "isEnabled" = EXCLUDED."isEnabled",
  "updatedAt" = NOW();

