// --- UNIFIED MARKETING ENGINE: STABILIZED EDITION (TIMEOUT-PROOF) ---

// 🔒 1. SECURITY SETTINGS
const SECRET_DASHBOARD_PATH = '/dashboard-FDff77'; 
const SAFE_REDIRECT_URL = 'https://google.com'; 
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "TAZAsara"; 

// 🤖 2. BOT DETECTION SETTINGS
const BOT_KEYWORDS = ['bot', 'spider', 'crawler', 'proxy', 'mimecast', 'barracuda', 'proofpoint', 'headless', 'inspect', 'python', 'curl', 'wget', 'httpclient'];

// ============================================================================
// 📦 DENO KV INITIALIZATION & COUNTER LOGIC
// ============================================================================
const kv = await Deno.openKv();

async function incrementStat(key: string) {
    let retries = 0;
    while (retries < 10) {
        const res = await kv.get(["stats", key]);
        const current = res.value ? Number((res.value as any).value ?? res.value) : 0;
        const commit = await kv.atomic()
            .check(res)
            .set(["stats", key], current + 1)
            .commit();
        
        if (commit.ok) return; 
        retries++; 
        await new Promise(r => setTimeout(r, 10 * retries)); 
    }
}

async function getStat(key: string): Promise<number> {
    const res = await kv.get(["stats", key]);
    if (!res.value) return 0;
    return Number((res.value as any).value ?? res.value);
}

// Safer database fetching method to prevent CPU stalling
async function fetchKvList(prefix: string[], limit: number = 100, reverse: boolean = true) {
    const results = [];
    for await (const entry of kv.list({ prefix }, { reverse, limit })) {
        results.push(entry.value);
    }
    return results;
}

// ============================================================================
// 🌍 3. FREE IP GEOLOCATION API
// ============================================================================
async function getGeoData(request: Request, ip: string) {
    const cfCountry = request.headers.get('cf-ipcountry');
    
    if (!ip || ip === "Unknown" || ip.includes("127.0.0.1") || ip.includes("localhost")) {
        return { country: cfCountry || "Unknown", isp: "Unknown" };
    }
    
    try {
        const res = await fetch(`http://ip-api.com/json/${ip}`);
        if (!res.ok) return { country: cfCountry || "Unknown", isp: "Unknown" };
        
        const data = await res.json();
        return { 
            country: data.country || cfCountry || "Unknown",
            isp: data.isp || "Unknown" 
        };
    } catch (e) {
        return { country: cfCountry || "Unknown", isp: "Unknown" };
    }
}

// ============================================================================
// 📱 4. DETECTORS & UTILS
// ============================================================================
function getClientApp(request: Request) {
    const ua = request.headers.get('User-Agent') || '';
    if (ua.includes('GoogleImageProxy')) return "✉️ Gmail Proxy";
    if (ua.includes('YahooMailProxy')) return "🟣 Yahoo Mail Proxy";
    if (ua.includes('WebKit_version')) return "🍎 Apple Mail / iCloud";
    if (/Outlook-iOS/i.test(ua)) return "📱 Outlook iOS App";
    if (/Outlook-Android/i.test(ua)) return "📱 Outlook Android App";
    if (ua.includes('Microsoft Office')) return "💻 Outlook Desktop";
    if (ua.includes('Thunderbird/')) return "🦅 Thunderbird";
    if (ua.includes('Superhuman/')) return "⚡ Superhuman App";
    if (/Edg\//i.test(ua)) return "🟦 Microsoft Edge";
    if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) return "🔵 Google Chrome";
    if (/Firefox\//i.test(ua)) return "🦊 Mozilla Firefox";
    if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) return "🧭 Apple Safari";
    if (ua.includes('iPhone') || ua.includes('iPad')) return "📱 iOS Device";
    if (ua.includes('Android')) return "🤖 Android Device";
    if (ua.includes('Windows NT')) return "💻 Windows PC";
    if (ua.includes('Macintosh')) return "💻 Mac Computer";
    return "🌐 Unknown Browser/App";
}

function checkIfBot(request: Request) {
    const ua = (request.headers.get('User-Agent') || '').toLowerCase();
    if (ua.includes('googleimageproxy') || ua.includes('yahoomailproxy') || ua.includes('webkit_version')) return 0; 
    for (let word of BOT_KEYWORDS) { if (ua.includes(word)) return 1; }
    return 0; 
}

function getClientIp(request: Request, connInfo: any) {
    let ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('cf-connecting-ip') || 
             request.headers.get('x-real-ip') || 
             connInfo?.remoteAddr?.hostname || 'Unknown';
             
    if (ip.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");
    return ip;
}

function checkAuth(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return false;
    const [scheme, encoded] = authHeader.split(' ');
    if (scheme !== 'Basic' || !encoded) return false;
    try {
        const decoded = atob(encoded);
        const [user, pass] = decoded.split(':');
        return user === ADMIN_USERNAME && pass === ADMIN_PASSWORD;
    } catch (e) { return false; }
}

function requireAuth() {
    return new Response('Unauthorized. Please log in.', {
        status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Secure Marketing Engine"' }
    });
}

// ============================================================================
// 🚀 SERVER ENTRY POINT
// ============================================================================
Deno.serve(async (request: Request, connInfo: any) => { 
    const url = new URL(request.url); 
    const path = url.pathname; 

    const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "*", "Access-Control-Allow-Headers": "*" };
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // Redirect Root Domain to Dashboard Automatically
    if (path === '/' || path === '') {
        return Response.redirect(`${url.origin}${SECRET_DASHBOARD_PATH}`, 302);
    }

    if (path === '/track.gif') return handleTrackingPixel(request, connInfo);
    if (path === '/unsubscribe') return handleUnsubscribe(request, connInfo);
    if (path === '/api/logs' && request.method === 'DELETE') return handleDeleteLogs(request, corsHeaders);
    if (path === '/api/logs' && request.method === 'GET') return handleGetLogs(request, corsHeaders);

    const isDashboardRoute = path === SECRET_DASHBOARD_PATH;
    const isApiRoute = path.startsWith('/api/links/');
    const isAnalyticsRoute = path.startsWith('/analytics/');

    if (isDashboardRoute || isApiRoute || isAnalyticsRoute) {
        if (!checkAuth(request)) return requireAuth();
        if (isDashboardRoute && request.method === 'GET') return handleMainPageRequest(request); 
        if (isDashboardRoute && request.method === 'POST') return handleShortenRequest(request); 
        if (isApiRoute && request.method === 'PATCH') return handleUpdateRequest(request, path.substring('/api/links/'.length)); 
        if (isApiRoute && request.method === 'DELETE') return handleDeleteRequest(path.substring('/api/links/'.length)); 
        if (isAnalyticsRoute) return handleAnalyticsPageRequest(request, path.substring('/analytics/'.length)); 
    }
    
    if (path !== '/favicon.ico') return handleCountAndRedirectRequest(request, connInfo, path.slice(1)); 
    return new Response(null, { status: 204 }); 
});

// --- UNSUBSCRIBE LOGIC ---
async function handleUnsubscribe(request: Request, connInfo: any) {
    const url = new URL(request.url);
    let email = null, profileName = 'Unknown';
    const dataParam = url.searchParams.get('data');

    if (dataParam) {
        try { const decoded = JSON.parse(atob(dataParam)); email = decoded.e; profileName = decoded.p; } catch(e) {}
    } else {
        email = url.searchParams.get('email'); profileName = url.searchParams.get('profile') || 'Unknown';
    }

    if (!email) return new Response("Invalid unsubscribe link.", { status: 400 });

    const clientApp = getClientApp(request);
    const isBot = checkIfBot(request);
    const ip = getClientIp(request, connInfo);
    const geo = await getGeoData(request, ip);
    
    const record = {
        email, profileName, country: geo.country, ip: ip, isp: geo.isp, is_bot: isBot,
        bot_reason: JSON.stringify({ label: clientApp, ua: request.headers.get('User-Agent') || 'None', asn: geo.isp }), 
        created_at: new Date().toISOString()
    };

    await kv.set(["unsubscribes", Date.now(), crypto.randomUUID()], record);
    await incrementStat("total_unsubscribes");

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Unsubscribed</title><style>body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f4f7f9; } .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); text-align: center; max-width: 450px; width: 90%; } .email-text { font-weight: bold; color: #dc3545; background: #fff0f0; padding: 4px 8px; border-radius: 4px; }</style></head><body><div class="card"><h2 style="color:#dc3545;">🛑 Unsubscribed</h2><p>The email address <br><span class="email-text">${email}</span><br>has been successfully removed.</p><p style="color: #999; margin-top: 30px;">You may now close this window.</p></div></body></html>`;
    return new Response(html, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
}

// --- TRACKING PIXEL LOGIC ---
async function handleTrackingPixel(request: Request, connInfo: any) {
    const url = new URL(request.url);
    let email = null, ticketId = 'Bulk', profileName = 'Unknown';
    const dataParam = url.searchParams.get('data');

    if (dataParam) {
        try { const decoded = JSON.parse(atob(dataParam)); email = decoded.e; profileName = decoded.p; ticketId = decoded.t; } catch(e) {}
    } else {
        email = url.searchParams.get('email'); ticketId = url.searchParams.get('ticketId') || 'Bulk'; profileName = url.searchParams.get('profile') || 'Unknown';
    }   
    
    if (email) {
        const ip = getClientIp(request, connInfo);
        const geo = await getGeoData(request, ip);
        const record = {
            email, ticketId, profileName, country: geo.country, ip: ip, isp: geo.isp, is_bot: checkIfBot(request), 
            bot_reason: JSON.stringify({ label: getClientApp(request), ua: request.headers.get('User-Agent') || 'None', asn: geo.isp }),
            openedAt: new Date().toISOString()
        };
        await kv.set(["opens", Date.now(), crypto.randomUUID()], record);
        await incrementStat("total_opens");
        if (record.is_bot) await incrementStat("total_bot_opens");
    }

    const base64Gif = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    const binaryGif = Uint8Array.from(atob(base64Gif), c => c.charCodeAt(0));
    return new Response(binaryGif, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } });
}

// --- SHORTENER LOGIC ---
async function handleCountAndRedirectRequest(request: Request, connInfo: any, shortCode: string) { 
    try {
        const urlReq = await kv.get(["urls", shortCode]);
        if (!urlReq.value) return new Response('Short URL not found', { status: 404 }); 
        const record: any = urlReq.value;

        let longUrl = record.long_url; 
        const urlObj = new URL(request.url);
        
        let emailParam = null, profileParam = 'Unknown';
        const dataParam = urlObj.searchParams.get('data');

        if (dataParam) {
            try { const decoded = JSON.parse(atob(dataParam)); emailParam = decoded.e; profileParam = decoded.p; } catch(e) {}
        } else {
            emailParam = urlObj.searchParams.get('email') || null; profileParam = urlObj.searchParams.get('profile') || 'Unknown';
        }
        
        const isBot = checkIfBot(request);
        const ip = getClientIp(request, connInfo);
        const geo = await getGeoData(request, ip);
        
        const clickRecord = {
            url_id: shortCode, short_code: shortCode, email: emailParam, country: geo.country, os: 'Unknown', browser: getClientApp(request),
            is_bot: isBot, bot_reason: JSON.stringify({ label: getClientApp(request), ua: request.headers.get('User-Agent') || 'None', asn: geo.isp }),
            ip: ip, isp: geo.isp, created_at: new Date().toISOString()
        };

        record.click_count += 1;
        await kv.set(["urls", shortCode], record);
        await kv.set(["clicks", Date.now(), crypto.randomUUID()], clickRecord);
        await incrementStat("total_clicks");
        if (isBot) await incrementStat("total_bot_clicks");

        if (!longUrl.startsWith('http://') && !longUrl.startsWith('https://')) longUrl = `http://${longUrl}`; 
        return new Response(null, { status: 307, headers: { 'Location': longUrl, 'Cache-Control': 'no-store' } });
    } catch (error) { return new Response('Error redirecting.', { status: 500 }); }
}

// --- API FUNCTIONS ---
async function handleGetLogs(request: Request, corsHeaders: any) {
    const logs = await fetchKvList(["opens"], 200, true);
    return new Response(JSON.stringify({ success: true, logs }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function handleDeleteLogs(request: Request, corsHeaders: any) {
    if (request.headers.get('x-tracking-secret') !== 'eygirl-secret-key-2026') return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: corsHeaders });
    const prefixes = ["opens", "clicks", "unsubscribes", "stats"];
    for (const prefix of prefixes) {
        for await (const entry of kv.list({ prefix: [prefix] })) await kv.delete(entry.key); 
    }
    for await (const entry of kv.list({ prefix: ["urls"] })) {
        const u: any = entry.value; u.click_count = 0; await kv.set(entry.key, u);
    }
    return new Response(JSON.stringify({ success: true, message: "Cleared" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function handleShortenRequest(request: Request) { 
    try { 
        const { longUrl, customCode } = await request.json(); 
        if (!longUrl) return new Response(JSON.stringify({ error: 'longUrl required' }), { status: 400 }); 
        let finalShortCode = customCode ? customCode.trim().replace(/\s+/g, '-') : Math.random().toString(36).substring(2, 9); 
        
        if (customCode && (await kv.get(["urls", finalShortCode])).value) {
            return new Response(JSON.stringify({ error: 'Name taken.' }), { status: 409 }); 
        } 
        const record = { long_url: longUrl, short_code: finalShortCode, click_count: 0, created_at: new Date().toISOString() };
        await kv.set(["urls", finalShortCode], record);
        await incrementStat("total_links");
        return new Response(JSON.stringify(record), { headers: { 'Content-Type': 'application/json' } }); 
    } catch (e: any) { return new Response(JSON.stringify({ error: e.message }), { status: 500 }); } 
}

async function handleUpdateRequest(request: Request, shortCode: string) { 
    const { long_url } = await request.json(); 
    const record = await kv.get(["urls", shortCode]);
    if (record.value) { (record.value as any).long_url = long_url; await kv.set(["urls", shortCode], record.value); }
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' }}); 
}

async function handleDeleteRequest(shortCode: string) { 
    await kv.delete(["urls", shortCode]);
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' }}); 
}

// ============================================================================
// 📊 UI HTML & DATA BUILDER (SAFELY ESCAPED & TIMEOUT PROOF)
// ============================================================================

function createSafeBadge(label: string, rawUA: string, rawASN: string) {
    let style = "background:#e0f2fe; color:#0369a1; border: 1px solid #bae6fd; padding:2px 6px; border-radius:4px; font-size:0.75em; cursor:pointer;";
    if (!label || label === 'null') { label = '👤 Human ✓'; style = "color:#28a745; font-weight:bold; font-size:0.85em; cursor:pointer;"; }
    else if (label.includes('Apple')) style = "background:#f3f4f6; color:#374151; border: 1px solid #d1d5db; padding:2px 6px; border-radius:4px; font-size:0.75em; cursor:pointer;";
    else if (label.includes('Gmail')) style = "background:#fee2e2; color:#b91c1c; border: 1px solid #fca5a5; padding:2px 6px; border-radius:4px; font-size:0.75em; cursor:pointer;";
    else if (label.includes('Scanner') || label.includes('Bot')) style = "background:#fecaca; color:#991b1b; padding:2px 6px; border-radius:4px; font-size:0.75em; cursor:pointer;";
    
    const safeUA = (rawUA || 'Unknown').replace(/"/g, "&quot;");
    const safeLabel = (label || 'Unknown').replace(/"/g, "&quot;");
    return `<span style="${style}" onclick="showRawData(this)" data-label="${safeLabel}" data-ua="${safeUA}" data-asn="${rawASN}" title="View Raw Data">${label}</span>`;
}

async function handleMainPageRequest(request: Request) { 
    try { 
        const origin = new URL(request.url).origin; 
        
        // Fetch sequentially to avoid jamming the free-tier KV connection pool
        const totalLinks = await getStat("total_links");
        const totalClicks = await getStat("total_clicks");
        const totalOpens = await getStat("total_opens");
        const totalUnsubscribes = await getStat("total_unsubscribes");

        // Reduced list sizes from 500 to 100 to prevent HTML string generation from timing out
        const recentLinks = await fetchKvList(["urls"], 100, false);
        const openers = await fetchKvList(["opens"], 100, true);
        const rawClicks = await fetchKvList(["clicks"], 100, true);

        const clicksMap: any = {}; const opensMap: any = {};
        const uniqueClickSet = new Set();
        
        rawClicks.forEach((c: any) => { 
            if (c.email && c.email !== 'Anonymous') {
                const e = c.email.trim().toLowerCase(); uniqueClickSet.add(e);
                clicksMap[e] = (clicksMap[e] || 0) + 1;
            }
        });
        openers.forEach((o: any) => { 
            if (o.email && o.email !== 'Anonymous') { opensMap[o.email.trim().toLowerCase()] = (opensMap[o.email.trim().toLowerCase()] || 0) + 1; } 
        });

        const uniqueClicks = uniqueClickSet.size;
        const trueUniqueUsers = new Set([...Object.keys(opensMap), ...Object.keys(clicksMap)]).size;

        const rawOpensSafe = openers.map((o: any) => {
            let label = o.bot_reason || '🌐 Web Browser'; let ua = 'Unknown', asn = o.isp || 'Unknown';
            try { if (o.bot_reason && o.bot_reason.startsWith('{')) { const p = JSON.parse(o.bot_reason); label = p.label; ua = p.ua; asn = p.asn; } } catch(e) {}
            return { date: o.openedAt, email: o.email, country: o.country || '-', ip: o.ip || '-', isp: o.isp || '-', isBot: !!o.is_bot, bot_reason: label, raw_ua: ua, raw_asn: asn };
        });

        const rawClicksSafe = rawClicks.map((c: any) => {
            let label = c.bot_reason || '🌐 Web Browser'; let ua = 'Unknown', asn = c.isp || 'Unknown';
            try { if (c.bot_reason && c.bot_reason.startsWith('{')) { const p = JSON.parse(c.bot_reason); label = p.label; ua = p.ua; asn = p.asn; } } catch(e) {}
            return { date: c.created_at, email: c.email || 'Anonymous', short_code: c.short_code, country: c.country || '-', ip: c.ip || '-', isp: c.isp || '-', isBot: !!c.is_bot, bot_reason: label, raw_ua: ua, raw_asn: asn };
        });

        const linksHtml = recentLinks.length ? recentLinks.map((link:any) => `
            <div class="link-card">
                <div><p class="short-url">${origin}/${link.short_code}</p><p class="long-url">${link.long_url}</p><p class="stats">Clicks: ${link.click_count || 0}</p></div>
                <div class="link-actions">
                    <button class="copy-btn" onclick="copyToClipboard('${origin}/${link.short_code}')">Copy</button>
                    <a href="/analytics/${link.short_code}" class="analytics-btn">Analytics</a>
                    <button class="delete-btn" onclick="deleteLink('${link.short_code}')">Delete</button>
                </div>
            </div>`).join('') : '<p style="text-align:center;">No links created yet.</p>';

        const openersHtml = rawOpensSafe.length ? rawOpensSafe.map((op:any, i:number) => `
            <tr style="${op.isBot ? "background: #fff0f0;" : ""}">
                <td style="text-align:center;">${rawOpensSafe.length - i}</td>
                <td style="text-align:center;">${op.isBot ? '🤖' : '👤'}</td>
                <td>${new Date(op.date).toLocaleString()}</td>
                <td><span style="color:#0056b3; font-weight:bold;">${op.email || 'Anonymous'}</span></td>
                <td><span style="font-family:monospace; color:#64748b;">${op.ip}</span></td>
                <td>${op.country}</td>
                <td style="text-align:center;">${createSafeBadge(op.bot_reason, op.raw_ua, op.raw_asn)}</td>
            </tr>`).join('') : '<tr><td colspan="7" style="text-align:center;">No opens tracked yet.</td></tr>';

        const clicksHtml = rawClicksSafe.length ? rawClicksSafe.map((c:any, i:number) => `
            <tr style="${c.isBot ? "background: #fff0f0;" : ""}">
                <td style="text-align:center;">${rawClicksSafe.length - i}</td>
                <td style="text-align:center;">${c.isBot ? '🤖' : '👤'}</td>
                <td>${new Date(c.date).toLocaleString()}</td>
                <td><a href="/analytics/${c.short_code}" style="color:#0ea5e9; font-weight:bold;">${c.short_code}</a></td>
                <td><span style="color:#0056b3; font-weight:bold;">${c.email}</span></td>
                <td><span style="font-family:monospace; color:#64748b;">${c.ip}</span></td>
                <td>${c.country}</td>
                <td style="text-align:center;">${createSafeBadge(c.bot_reason, c.raw_ua, c.raw_asn)}</td>
            </tr>`).join('') : '<tr><td colspan="8" style="text-align:center;">No clicks yet.</td></tr>';

        const safeOpensJSON = JSON.stringify(rawOpensSafe).replace(/</g, '\\u003c');
        const safeClicksJSON = JSON.stringify(rawClicksSafe).replace(/</g, '\\u003c');

        const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Marketing Dashboard</title>
            <style>
                body { font-family: system-ui, sans-serif; background: #f4f7f9; margin: 0; padding: 2rem 0; color: #333; display: flex; flex-direction: column; align-items: center; }
                .container { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,.1); width: 98%; max-width: 1400px; margin-bottom: 2rem; }
                h1, h2, h3 { margin-top: 0; }
                input { width: 100%; padding: .75rem; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; margin-bottom: 10px; }
                button { background: #007bff; color: white; padding: .75rem 1.5rem; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; width: 100%; }
                button:hover { background: #0056b3; }
                .summary-box { display: flex; justify-content: center; background: #f8f9fa; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; flex-wrap: wrap; gap: 15px; }
                .stat { text-align: center; min-width: 110px; padding: 15px; background: white; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border: 1px solid transparent; cursor: pointer;}
                .stat:hover { transform: translateY(-3px); box-shadow: 0 6px 12px rgba(0,0,0,0.15); border-color: #007bff; }
                .stat-value { font-size: 1.8rem; font-weight: 700; color: #007bff; }
                .stat-label { font-size: .8rem; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px; font-weight:bold; }
                .link-card { border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; }
                .short-url { font-weight: bold; color: #0056b3; margin: 0 0 5px 0; }
                .long-url { font-size: .9em; color: #666; margin: 0 0 5px 0; word-break: break-all; }
                .stats { font-size: .85em; color: #888; margin: 0; }
                .link-actions { display: flex; gap: 5px; }
                .link-actions button, .link-actions a { padding: 6px 12px; font-size: 0.85rem; text-decoration: none; width: auto; display:inline-block; text-align:center; border-radius:4px;}
                .copy-btn { background: #17a2b8; }
                .analytics-btn { background: #6c757d; color: white; }
                .delete-btn { background: #dc3545; }
                table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.95em; }
                th, td { padding: 12px 10px; text-align: left; border-bottom: 1px solid #eee; }
                th { background: #f8f9fa; white-space: nowrap; }
                #toast { visibility: hidden; min-width: 250px; background: #333; color: #fff; text-align: center; border-radius: 8px; padding: 16px; position: fixed; z-index: 10010; bottom: 30px; left: 50%; transform: translateX(-50%); }
                #toast.show { visibility: visible; }
                .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 9999; align-items: center; justify-content: center; }
                .modal-content { background: #fff; padding: 20px; border-radius: 8px; width: 95%; max-width: 1400px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
                .modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 10px; }
                .close-btn { background: #dc3545; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; width: auto; }
            </style>
        </head>
        <body>
            <div id="toast">Message here</div>

            <div id="raw-data-modal" class="modal-overlay" onclick="closeRawModal()">
                <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2 style="margin:0; color:#10b981;">📡 Raw Server Data</h2>
                        <button class="close-btn" onclick="closeRawModal()">Close</button>
                    </div>
                    <div id="raw-modal-body-content" style="overflow-y:auto;"></div>
                </div>
            </div>

            <div id="table-modal" class="modal-overlay" onclick="closeTableModal()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h2 id="table-modal-title" style="margin:0; color:#333;">Data View</h2>
                        <button class="close-btn" onclick="closeTableModal()">Close Data</button>
                    </div>
                    <div style="background:#e0f2fe; color:#0369a1; padding:10px; text-align:center; border-radius:6px; margin-bottom:10px; font-weight:bold;">
                        Displaying up to the 100 newest events.
                    </div>
                    
                    <div id="opens-section" style="display:none; max-height: 650px; overflow-y: auto;">
                        <table><thead><tr><th style="text-align:center;">#</th><th style="text-align:center;">Status</th><th>Time</th><th>User Email</th><th>IP Address</th><th>Location</th><th style="text-align:center;">Client Application</th></tr></thead><tbody>${openersHtml}</tbody></table>
                    </div>

                    <div id="clicks-section" style="display:none; max-height: 650px; overflow-y: auto;">
                        <table><thead><tr><th style="text-align:center;">#</th><th style="text-align:center;">Status</th><th>Time</th><th>Link</th><th>User Email</th><th>IP Address</th><th>Location</th><th style="text-align:center;">Client Application</th></tr></thead><tbody>${clicksHtml}</tbody></table>
                    </div>
                </div>
            </div>

            <div class="container">
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-bottom:1rem;">
                    <h1 style="margin:0;">Marketing Engine</h1>
                    <button onclick="clearAllLogs()" style="width:auto; background:#dc3545; padding:8px 16px;">🗑️ Clear Data</button>
                </div>

                <div class="summary-box">
                    <div class="stat"><div class="stat-value">${totalLinks}</div><div class="stat-label">Active Links</div></div>
                    <div class="stat" onclick="openTableModal('clicks-section', 'All Clicks Log')"><div class="stat-value">${totalClicks}</div><div class="stat-label">Total Clicks</div></div>
                    <div class="stat" onclick="openTableModal('clicks-section', 'Unique Clicks Log')"><div class="stat-value" style="color:#20c997;">${uniqueClicks}</div><div class="stat-label">Unique Clicks</div></div>
                    <div class="stat" onclick="openTableModal('opens-section', 'Pixel Opens Log')"><div class="stat-value">${totalOpens}</div><div class="stat-label">Total Opens</div></div>
                    <div class="stat"><div class="stat-value">${trueUniqueUsers}</div><div class="stat-label">Total Engaged Users</div></div>
                    <div class="stat" style="border-left: 2px solid #eee;"><div class="stat-value" style="color:#dc3545;">${totalUnsubscribes}</div><div class="stat-label" style="font-weight:bold;">Unsubscribes</div></div>
                </div>

                <div style="width: 100%;">
                    <form id="shorten-form" style="background:#f8f9fa; padding:1.5rem; border-radius:8px; margin-bottom:2rem;">
                        <h3>Create Trackable Link</h3>
                        <input type="url" id="long-url" required placeholder="Destination URL (e.g., https://example.com)">
                        <input type="text" id="custom-code" placeholder="Custom Short Code (Optional)">
                        <button type="submit" id="submit-btn">Shorten URL</button>
                    </form>
                    <h3>Your Links</h3>
                    ${linksHtml}
                </div>
            </div>

            <script>
                const rawOpensData = ${safeOpensJSON};
                const rawClicksData = ${safeClicksJSON};

                function openTableModal(sectionId, titleText) { 
                    document.getElementById('table-modal-title').innerText = titleText; 
                    document.getElementById('opens-section').style.display = 'none'; 
                    document.getElementById('clicks-section').style.display = 'none'; 
                    document.getElementById(sectionId).style.display = 'block'; 
                    document.getElementById('table-modal').style.display = 'flex'; 
                } 
                function closeTableModal() { 
                    document.getElementById('table-modal').style.display = 'none'; 
                } 

                function showRawData(element) { 
                    if (event) event.stopPropagation(); 
                    const label = element.getAttribute('data-label') || 'Unknown';
                    const ua = element.getAttribute('data-ua') || 'Unknown';
                    const asn = element.getAttribute('data-asn') || 'Unknown';
                    
                    const body = document.getElementById('raw-modal-body-content'); 
                    body.innerHTML = \`
                        <div style="background:#1e293b; color:#10b981; font-family:monospace; padding:15px; border-radius:8px; overflow-wrap: break-word;">
                            <p style="margin:0 0 10px 0; color:#cbd5e1;">// DEVICE RAW DATA REPORT</p>
                            <p style="margin:0 0 5px 0;"><strong>Detected App:</strong> \${label}</p>
                            <p style="margin:0 0 5px 0;"><strong>Provider ASN:</strong> \${asn}</p>
                            <p style="margin:0 0 5px 0;"><strong>Raw User-Agent:</strong><br>\${ua}</p>
                        </div>\`; 
                        
                    document.getElementById('raw-data-modal').style.display = 'flex'; 
                } 
                function closeRawModal() { 
                    document.getElementById('raw-data-modal').style.display = 'none'; 
                } 

                function showToast(msg) { 
                    const t = document.getElementById("toast"); 
                    t.textContent = msg; 
                    t.className = "show"; 
                    setTimeout(() => t.className = t.className.replace("show", ""), 3000); 
                } 

                function copyToClipboard(text) { 
                    navigator.clipboard.writeText(text).then(() => showToast("Copied!")).catch(() => showToast("Failed to copy.")); 
                } 

                document.getElementById("shorten-form").addEventListener("submit", async e => { 
                    e.preventDefault(); 
                    const btn = document.getElementById("submit-btn"); 
                    btn.textContent = "Creating..."; 
                    btn.disabled = true; 
                    try { 
                        const res = await fetch("${SECRET_DASHBOARD_PATH}", { 
                            method: "POST", headers: {"Content-Type": "application/json"}, 
                            body: JSON.stringify({ longUrl: document.getElementById("long-url").value, customCode: document.getElementById("custom-code").value }) 
                        }); 
                        if(res.ok) { 
                            showToast("Link created! 🎉"); 
                            setTimeout(() => window.location.reload(), 1000); 
                        } else { 
                            const data = await res.json(); 
                            showToast("Error: " + (data.error || "Unknown")); 
                        } 
                    } catch(err) { 
                        showToast("Network error."); 
                    } 
                    btn.textContent = "Shorten URL"; 
                    btn.disabled = false; 
                }); 

                async function deleteLink(code) { 
                    if(!confirm("Permanently delete link?")) return; 
                    try { 
                        const res = await fetch('/api/links/' + code, {method: "DELETE"}); 
                        if(res.ok) window.location.reload(); else showToast("Failed."); 
                    } catch(e) { 
                        showToast("Error."); 
                    } 
                } 

                async function clearAllLogs() { 
                    const pwd = prompt("Enter password to clear ALL tracking data:"); 
                    if (pwd !== 'password' && pwd !== 'pasword') { 
                        if (pwd !== null) showToast("Incorrect password!"); 
                        return; 
                    } 
                    try { 
                        const res = await fetch('/api/logs', { method: 'DELETE', headers: { 'x-tracking-secret': 'eygirl-secret-key-2026' }}); 
                        if(res.ok) { 
                            showToast("All data wiped!"); 
                            setTimeout(() => window.location.reload(), 1000); 
                        } else {
                            showToast("Failed."); 
                        }
                    } catch(e) { 
                        showToast("Error clearing logs."); 
                    } 
                }
            </script>
        </body>
        </html>`;

        return new Response(html, { headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'no-cache' } }); 
    } catch (error: any) { 
        return new Response(`Error loading dashboard: ${error.message}`, { status: 500, headers: { 'Content-Type': 'text/plain' } }); 
    } 
}

// Analytics Request Logic
async function handleAnalyticsPageRequest(request: Request, shortCode: string) {
    try {
        const linkDataReq = await kv.get(["urls", shortCode]);
        if (!linkDataReq.value) return new Response('Link not found.', { status: 404 });
        const linkData: any = linkDataReq.value;

        const rawClicksSafe: any[] = []; 
        for await (const entry of kv.list({ prefix: ["clicks"] }, { reverse: true, limit: 200 })) {
            const c: any = entry.value;
            if (c.short_code !== shortCode) continue;
            
            let label = c.bot_reason || '🌐 Web Browser'; let ua = 'Unknown'; let asn = 'Unknown';
            try { if (c.bot_reason && c.bot_reason.startsWith('{')) { const parsed = JSON.parse(c.bot_reason); label = parsed.label; ua = parsed.ua; asn = parsed.asn; } } catch(e) {}
            rawClicksSafe.push({ date: c.created_at, email: c.email || 'Anonymous', country: c.country || 'Unknown', os: c.os || 'Unknown', browser: c.browser || 'Unknown', isBot: c.is_bot == 1 || c.is_bot === true, ip: c.ip || '-', isp: c.isp || '-', bot_reason: label, raw_ua: ua, raw_asn: asn });
        }

        const clicksHtmlRows = rawClicksSafe.map((c, i) => `
            <tr style="${c.isBot ? "background: #fff0f0;" : ""}">
                <td style="text-align:center;">${rawClicksSafe.length - i}</td>
                <td>${new Date(c.date).toLocaleString()}</td>
                <td><span style="color:#0056b3; font-weight:bold;">${c.email}</span></td>
                <td><span style="font-family:monospace; color:#64748b;">${c.ip || '-'}</span></td>
                <td style="text-align:center;">${c.country}</td>
                <td style="text-align:center;">${c.isBot ? '🤖 Bot' : '👤 Human'}</td>
                <td style="text-align:center;">${createSafeBadge(c.bot_reason, c.raw_ua, c.raw_asn)}</td>
            </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;">No clicks yet.</td></tr>';

        const pageHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Analytics: ${shortCode}</title>
            <style>
                body { font-family: system-ui, sans-serif; background: #f4f7f9; margin: 0; padding: 2rem; color: #333; }
                .container { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,.1); max-width: 1400px; margin: auto; }
                table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.95em; }
                th, td { padding: 12px 10px; text-align: left; border-bottom: 1px solid #eee; }
                th { background: #f8f9fa; }
                .back-btn { background: #6c757d; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block; margin-bottom: 15px; }
                .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10005; align-items: center; justify-content: center; }
                .modal-content { background: #fff; padding: 20px; border-radius: 8px; width: 95%; max-width: 600px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
                .close-btn { background: #dc3545; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; width: auto; float: right; }
            </style>
        </head>
        <body>
            <div id="raw-data-modal" class="modal-overlay" onclick="closeRawModal()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <div style="border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 10px;">
                        <h2 style="margin:0; color:#10b981; display:inline-block;">📡 Raw Server Data</h2>
                        <button class="close-btn" onclick="closeRawModal()">Close</button>
                    </div>
                    <div id="raw-modal-body-content" style="overflow-y:auto;"></div>
                </div>
            </div>

            <div class="container">
                <a href="${SECRET_DASHBOARD_PATH}" class="back-btn">&larr; Back to Dashboard</a>
                <h2>Analytics for /${shortCode}</h2>
                <p><strong>Destination:</strong> ${linkData.long_url}</p>
                <div style="max-height: 700px; overflow-y: auto; border: 1px solid #eee; border-radius: 8px; margin-top:20px;">
                    <table><thead><tr><th style="text-align:center;">#</th><th>Time</th><th>Email</th><th>IP Address</th><th style="text-align:center;">Location</th><th style="text-align:center;">Status</th><th style="text-align:center;">App / Client</th></tr></thead><tbody>${clicksHtmlRows}</tbody></table>
                </div>
            </div>

            <script>
                function showRawData(element) { 
                    if (event) event.stopPropagation(); 
                    const label = element.getAttribute('data-label') || 'Unknown';
                    const ua = element.getAttribute('data-ua') || 'Unknown';
                    const asn = element.getAttribute('data-asn') || 'Unknown';
                    const body = document.getElementById('raw-modal-body-content'); 
                    
                    body.innerHTML = \`
                        <div style="background:#1e293b; color:#10b981; font-family:monospace; padding:15px; border-radius:8px; overflow-wrap: break-word;">
                            <p style="margin:0 0 10px 0; color:#cbd5e1;">// DEVICE RAW DATA REPORT</p>
                            <p style="margin:0 0 5px 0;"><strong>Detected App:</strong> \${label}</p>
                            <p style="margin:0 0 5px 0;"><strong>Provider ASN:</strong> \${asn}</p>
                            <p style="margin:0 0 5px 0;"><strong>Raw User-Agent:</strong><br>\${ua}</p>
                        </div>\`; 
                        
                    document.getElementById('raw-data-modal').style.display = 'flex'; 
                } 
                function closeRawModal() { 
                    document.getElementById('raw-data-modal').style.display = 'none'; 
                }
            </script>
        </body>
        </html>`;
        return new Response(pageHtml, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
    } catch (error) { return new Response('Error loading analytics: ' + String(error), { status: 500 }); }
}
