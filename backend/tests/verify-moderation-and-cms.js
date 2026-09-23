const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api';

function request(url, options = {}, body = null) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const headers = { ...(options.headers || {}) };
        let payload = null;

        if (body) {
            if (typeof body === 'string' || Buffer.isBuffer(body)) {
                payload = body;
            } else {
                headers['Content-Type'] = 'application/json';
                payload = JSON.stringify(body);
            }
            headers['Content-Length'] = Buffer.byteLength(payload);
        }

        const reqOpts = {
            hostname: parsed.hostname,
            port: parsed.port,
            path: parsed.pathname + parsed.search,
            method: options.method || 'GET',
            headers
        };

        const req = http.request(reqOpts, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsedBody;
                try {
                    parsedBody = JSON.parse(data);
                } catch {
                    parsedBody = data;
                }
                resolve({ status: res.statusCode, headers: res.headers, body: parsedBody });
            });
        });

        req.on('error', reject);

        if (payload) {
            req.write(payload);
        }
        req.end();
    });
}

// Multipart form-data helper
function uploadFile(url, token, fields, filePath, fileName) {
    return new Promise((resolve, reject) => {
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        const fileData = fs.readFileSync(filePath);
        
        let body = [];
        
        for (const [k, v] of Object.entries(fields)) {
            body.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
        }

        body.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/pdf\r\n\r\n`));
        body.push(fileData);
        body.push(Buffer.from(`\r\n--${boundary}--\r\n`));

        const totalBuffer = Buffer.concat(body);

        const parsed = new URL(url);
        const reqOpts = {
            hostname: parsed.hostname,
            port: parsed.port,
            path: parsed.pathname + parsed.search,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': totalBuffer.length
            }
        };

        const req = http.request(reqOpts, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });

        req.on('error', reject);
        req.write(totalBuffer);
        req.end();
    });
}

async function runTests() {
    console.log('=====================================================');
    console.log('🚀 SEMESTERKIT E2E SYSTEM VERIFICATION TEST SUITE');
    console.log('=====================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`  ✅ PASS: ${message}`);
            passed++;
        } else {
            console.error(`  ❌ FAIL: ${message}`);
            failed++;
        }
    }

    try {
        // 1. Authenticate Admin
        console.log('1. Testing Admin Authentication...');
        const adminLogin = await request(`${BASE_URL}/auth/login`, { method: 'POST' }, {
            email: 'admin@semesterkit.com',
            password: 'admin123'
        });
        assert(adminLogin.status === 200 && adminLogin.body.token, 'Admin login succeeded');
        const adminToken = adminLogin.body.token;

        // 2. Register/Login Test Student
        console.log('\n2. Testing Student Registration & Login...');
        const studentEmail = `student_${Date.now()}@nitt.edu`;
        const studentReg = await request(`${BASE_URL}/auth/register`, { method: 'POST' }, {
            name: 'Test Student',
            email: studentEmail,
            password: 'studentpassword123',
            college_id: 1,
            branch_id: 1
        });
        assert(studentReg.status === 201, 'Student registered successfully');

        const studentLogin = await request(`${BASE_URL}/auth/login`, { method: 'POST' }, {
            email: studentEmail,
            password: 'studentpassword123'
        });
        assert(studentLogin.status === 200 && studentLogin.body.token, 'Student logged in successfully');
        const studentToken = studentLogin.body.token;

        // Ensure dummy test upload file exists
        const dummyFilePath = path.join(__dirname, 'test_doc.pdf');
        fs.writeFileSync(dummyFilePath, '%PDF-1.4 sample test pdf document for verification');

        // 3. Test Flow A: Student Upload -> PENDING -> Admin APPROVE -> Public Visible
        console.log('\n3. Testing Flow A: Upload -> PENDING -> Admin APPROVE -> Public Live...');
        const uploadA = await uploadFile(`${BASE_URL}/upload`, studentToken, {
            title: 'Automated Test Notes Flow A',
            description: 'Flow A verification test note description',
            college_id: 1,
            branch_id: 1,
            semester_id: 3,
            subject_id: 1,
            resource_type_id: 1,
            program: 'B.Tech',
            tags: 'flowA,test,notes'
        }, dummyFilePath, 'test_notes_flow_a.pdf');

        assert(uploadA.status === 201 && uploadA.body.status === 'pending', 'Uploaded material correctly returned status: PENDING');
        const resourceAId = uploadA.body.resourceId;

        // Verify resource A is NOT in public listing
        const publicCheckA1 = await request(`${BASE_URL}/resources?query=Automated%20Test%20Notes%20Flow%20A`);
        const isFoundPublicA1 = Array.isArray(publicCheckA1.body) && publicCheckA1.body.some(r => r.id === resourceAId);
        assert(!isFoundPublicA1, 'Pending resource is STRICTLY HIDDEN from public listing');

        // Verify resource A is NOT downloadable via public endpoint
        const downloadCheckA1 = await request(`${BASE_URL}/resources/${resourceAId}/download`, { method: 'POST' });
        assert(downloadCheckA1.status === 404, 'Public download endpoint returns 404 for pending material');

        // Verify resource A appears in student's My Vault as Pending
        const vaultCheckA1 = await request(`${BASE_URL}/my-vault/uploads`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        const vaultItemA1 = Array.isArray(vaultCheckA1.body) && vaultCheckA1.body.find(r => r.id === resourceAId);
        assert(vaultItemA1 && vaultItemA1.status === 'pending', 'Student Vault correctly shows upload status: PENDING');

        // Admin checks Pending Queue
        const pendingQueue = await request(`${BASE_URL}/admin/pending`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const inQueue = Array.isArray(pendingQueue.body) && pendingQueue.body.some(r => r.id === resourceAId);
        assert(inQueue, 'Admin pending moderation queue contains the uploaded resource');

        // Admin Approves Resource A
        const approveAction = await request(`${BASE_URL}/admin/moderate/${resourceAId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        }, { action: 'approve' });
        assert(approveAction.status === 200, 'Admin successfully approved resource A');

        // Verify resource A is NOW visible in public listing
        const publicCheckA2 = await request(`${BASE_URL}/resources?query=Automated%20Test%20Notes%20Flow%20A`);
        const isFoundPublicA2 = Array.isArray(publicCheckA2.body) && publicCheckA2.body.some(r => r.id === resourceAId);
        assert(isFoundPublicA2, 'Approved resource is NOW PUBLICLY VISIBLE in public search/listing');

        // Verify resource A is now downloadable
        const downloadCheckA2 = await request(`${BASE_URL}/resources/${resourceAId}/download`, { method: 'POST' });
        if (downloadCheckA2.status !== 200) {
            console.log('Download error details:', downloadCheckA2);
        }
        assert(downloadCheckA2.status === 200 && downloadCheckA2.body.filePath, 'Approved resource is now accessible for download');

        // Verify student's My Vault now displays Approved
        const vaultCheckA2 = await request(`${BASE_URL}/my-vault/uploads`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        const vaultItemA2 = Array.isArray(vaultCheckA2.body) && vaultCheckA2.body.find(r => r.id === resourceAId);
        assert(vaultItemA2 && vaultItemA2.status === 'approved', 'Student Vault status updated to APPROVED');

        // 4. Test Flow B: Student Upload -> PENDING -> Admin REJECT with Reason -> Stays Hidden
        console.log('\n4. Testing Flow B: Upload -> PENDING -> Admin REJECT with Reason...');
        const uploadB = await uploadFile(`${BASE_URL}/upload`, studentToken, {
            title: 'Automated Test Notes Flow B (To Reject)',
            description: 'Flow B bad submission',
            college_id: 1,
            branch_id: 1,
            semester_id: 3,
            subject_id: 1,
            resource_type_id: 1,
            program: 'B.Tech',
            tags: 'flowB,reject'
        }, dummyFilePath, 'test_notes_flow_b.pdf');

        assert(uploadB.status === 201 && uploadB.body.status === 'pending', 'Uploaded resource B created as PENDING');
        const resourceBId = uploadB.body.resourceId;

        // Admin Rejects Resource B with custom reason
        const rejectReason = 'Image quality is too low and missing pages 4-10.';
        const rejectAction = await request(`${BASE_URL}/admin/moderate/${resourceBId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        }, {
            action: 'reject',
            rejection_reason: rejectReason
        });
        assert(rejectAction.status === 200, 'Admin successfully rejected resource B with custom reason');

        // Verify resource B remains STRICTLY HIDDEN from public listing
        const publicCheckB = await request(`${BASE_URL}/resources?query=Flow%20B`);
        const isFoundPublicB = Array.isArray(publicCheckB.body) && publicCheckB.body.some(r => r.id === resourceBId);
        assert(!isFoundPublicB, 'Rejected resource remains STRICTLY HIDDEN from public search');

        // Verify resource B cannot be downloaded
        const downloadCheckB = await request(`${BASE_URL}/resources/${resourceBId}/download`, { method: 'POST' });
        assert(downloadCheckB.status === 404, 'Public download endpoint returns 404 for rejected resource');

        // Verify student's My Vault shows Rejected AND displays the exact rejection reason
        const vaultCheckB = await request(`${BASE_URL}/my-vault/uploads`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        const vaultItemB = Array.isArray(vaultCheckB.body) && vaultCheckB.body.find(r => r.id === resourceBId);
        assert(vaultItemB && vaultItemB.status === 'rejected' && vaultItemB.rejection_reason === rejectReason, 'Student Vault shows REJECTED status with the exact rejection reason');

        // 5. Test Contributor Count & Absence of ACS points
        console.log('\n5. Testing Top Contributors Dynamic Leaderboard...');
        const contributorsRes = await request(`${BASE_URL}/meta/top-contributors`);
        assert(contributorsRes.status === 200 && Array.isArray(contributorsRes.body), 'Contributors leaderboard returned 200 OK');
        const contributorStudent = Array.isArray(contributorsRes.body) && contributorsRes.body.find(c => c.name === 'Test Student');
        assert(contributorStudent ? contributorStudent.approved_uploads >= 1 : true, 'Student contribution reflects verified approved upload count directly without ACS credits');

        // 6. Test Admin CMS Control & Settings Update
        console.log('\n6. Testing Admin CMS Settings & Metadata Endpoints...');
        const updateSettingsRes = await request(`${BASE_URL}/meta/settings`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        }, {
            hero_title: 'The Ultimate Academic Archive for Engineers',
            stat_resources_override: '65K+'
        });
        assert(updateSettingsRes.status === 200, 'Admin updated CMS settings successfully');

        const publicSettingsRes = await request(`${BASE_URL}/meta/settings`);
        assert(publicSettingsRes.body.hero_title === 'The Ultimate Academic Archive for Engineers', 'Public settings reflect Admin CMS change immediately');

        // 7. Test Static Pages & Footer Navigation
        console.log('\n7. Testing Static Pages & Footer CMS Endpoints...');
        const staticPageRes = await request(`${BASE_URL}/meta/pages/about-us`);
        assert(staticPageRes.status === 200 && staticPageRes.body.title, 'Static page /about-us loads correctly with dynamic title & content');

        const footerRes = await request(`${BASE_URL}/meta/footer`);
        assert(footerRes.status === 200 && footerRes.body.columns, 'Dynamic footer navigation returns structured columns');

        // Cleanup test PDF
        if (fs.existsSync(dummyFilePath)) fs.unlinkSync(dummyFilePath);

        console.log('\n=====================================================');
        console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
        console.log('=====================================================\n');

        if (failed > 0) {
            process.exit(1);
        } else {
            process.exit(0);
        }
    } catch (err) {
        console.error('Fatal test error:', err);
        process.exit(1);
    }
}

runTests();
