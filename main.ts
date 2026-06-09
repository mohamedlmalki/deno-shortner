// --- UNIFIED MARKETING ENGINE: PURE DENO KV EDITION (WITH FREE GEOLOCATION) ---

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
    }
}

async function getStat(key: string): Promise<number> {
    const res = await kv.get(["stats", key]);
    if (!res.value) return 0;
    return Number((res.value as any).value ?? res.value);
}

// ============================================================================
// 🌍 3. FREE IP GEOLOCATION API (NO ACCOUNT NEEDED)
// ============================================================================
async function getGeoData(request: Request, ip: string) {
    // If you ever use Cloudflare in the future, this catches it instantly for free
    const cfCountry = request.headers.get('cf-ipcountry');
    
    // Skip local testing IPs
    if (!ip || ip === "Unknown" || ip.includes("127.0.0.1") || ip.includes("localhost")) {
        return { country: cfCountry || "Unknown", isp: "Unknown" };
    }
    
    try {
        // Pings ip-api.com (Free, no keys needed, up to 45 requests per minute)
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
// 📱 4. APP CLIENT DETECTOR
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
             
    // This silently removes the "::ffff:" from modern IPv6 servers
    // so your dashboard looks clean!
    if (ip.startsWith("::ffff:")) {
        ip = ip.replace("::ffff:", "");
    }
    
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

    // 1. PUBLIC TRACKER ROUTES
    if (path === '/track.gif') return handleTrackingPixel(request, connInfo);
    if (path === '/unsubscribe') return handleUnsubscribe(request, connInfo);
    
    if (path === '/api/logs' && request.method === 'DELETE') return handleDeleteLogs(request, corsHeaders);
    if (path === '/api/logs' && request.method === 'GET') return handleGetLogs(request, corsHeaders);

    // 2. SECURE ROUTES
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
    
    if (path === '/' || path === '') return new Response('404 Not Found', { status: 404 });
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
    const botReasonPayload = JSON.stringify({ label: clientApp, ua: request.headers.get('User-Agent') || 'None', asn: 'Unknown' });
    
    // Get IP and Location
    const ip = getClientIp(request, connInfo);
    const geo = await getGeoData(request, ip);
    
    const record = {
        email, profileName, 
        country: geo.country,
        ip: ip, isp: geo.isp, 
        is_bot: isBot,
        bot_reason: botReasonPayload, created_at: new Date().toISOString()
    };

    await kv.set(["unsubscribes", Date.now(), crypto.randomUUID()], record);
    await incrementStat("total_unsubscribes");

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Unsubscribe Successful</title><style>body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f4f7f9; margin: 0; } .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); text-align: center; max-width: 450px; width: 90%; } .icon { font-size: 50px; color: #dc3545; margin-bottom: 15px; } h2 { color: #333; margin-top: 0; margin-bottom: 10px; } p { color: #666; font-size: 1.05em; line-height: 1.5; } .email-text { font-weight: bold; color: #dc3545; background: #fff0f0; padding: 4px 8px; border-radius: 4px; word-break: break-all; }</style></head>
    <body><div class="card"><div class="icon">🛑</div><h2>Unsubscribed</h2><p>The email address <br><span class="email-text">${email}</span><br>has been successfully removed.</p><p style="font-size: 0.9em; color: #999; margin-top: 30px;">You may now close this window.</p></div></body></html>`;
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
        // Get IP and Location
        const ip = getClientIp(request, connInfo);
        const geo = await getGeoData(request, ip);
        
        const record = {
            email, ticketId, profileName,
            country: geo.country,
            ip: ip, isp: geo.isp,
            is_bot: checkIfBot(request), 
            bot_reason: JSON.stringify({ label: getClientApp(request), ua: request.headers.get('User-Agent') || 'None', asn: 'Unknown' }),
            openedAt: new Date().toISOString()
        };
        await kv.set(["opens", Date.now(), crypto.randomUUID()], record);
        await incrementStat("total_opens");
        if (record.is_bot) await incrementStat("total_bot_opens");
    }

    const base64Gif = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    const binaryGif = Uint8Array.from(atob(base64Gif), c => c.charCodeAt(0));
    return new Response(binaryGif, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", "Pragma": "no-cache", "Expires": "0" } });
}

// --- SHORTENER LOGIC ---
async function handleCountAndRedirectRequest(request: Request, connInfo: any, shortCode: string) { 
    try {
        const urlReq = await kv.get(["urls", shortCode]);
        if (!urlReq.value) return new Response('Short URL not found', { status: 404 }); 
        const record: any = urlReq.value;

        let longUrl = record.long_url; 
        const urlObj = new URL(request.url);
        
        let emailParam = null, profileParam = 'Unknown', ticketIdParam = 'Ghost-Click';
        const dataParam = urlObj.searchParams.get('data');

        if (dataParam) {
            try { const decoded = JSON.parse(atob(dataParam)); emailParam = decoded.e; profileParam = decoded.p; ticketIdParam = decoded.t; } catch(e) {}
        } else {
            emailParam = urlObj.searchParams.get('email') || null; profileParam = urlObj.searchParams.get('profile') || 'Unknown'; ticketIdParam = urlObj.searchParams.get('ticketId') || 'Ghost-Click';
        }
        
        const isBot = checkIfBot(request);
        
        // Get IP and Location
        const ip = getClientIp(request, connInfo);
        const geo = await getGeoData(request, ip);
        
        const clickRecord = {
            url_id: shortCode, short_code: shortCode, email: emailParam,
            country: geo.country, os: 'Unknown', browser: getClientApp(request),
            is_bot: isBot,
            bot_reason: JSON.stringify({ label: getClientApp(request), ua: request.headers.get('User-Agent') || 'None', asn: geo.isp }),
            ip: ip, isp: geo.isp, created_at: new Date().toISOString()
        };

        record.click_count += 1;
        await kv.set(["urls", shortCode], record);
        await kv.set(["clicks", Date.now(), crypto.randomUUID()], clickRecord);
        await incrementStat("total_clicks");
        if (isBot) await incrementStat("total_bot_clicks");

        if (!longUrl.startsWith('http://') && !longUrl.startsWith('https://')) longUrl = `http://${longUrl}`; 
        
        return new Response(null, {
            status: 307,
            headers: { 'Location': longUrl, 'Cache-Control': 'private, no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0', 'Pragma': 'no-cache', 'Expires': '0' }
        });
    } catch (error) { return new Response('Error redirecting.', { status: 500 }); }
}

// --- API & SYSTEM FUNCTIONS ---
async function handleGetLogs(request: Request, corsHeaders: any) {
    const logs = [];
    for await (const entry of kv.list({ prefix: ["opens"] }, { reverse: true, limit: 1000 })) {
        logs.push({ ...entry.value as any, hasClicked: false, clickCount: 0, clickCountry: null });
    }
    return new Response(JSON.stringify({ success: true, logs }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function handleDeleteLogs(request: Request, corsHeaders: any) {
    if (request.headers.get('x-tracking-secret') !== 'eygirl-secret-key-2026') return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: corsHeaders });
    
    const prefixes = ["opens", "clicks", "unsubscribes", "stats"];
    for (const prefix of prefixes) {
        for await (const entry of kv.list({ prefix: [prefix] })) { await kv.delete(entry.key); }
    }
    for await (const entry of kv.list({ prefix: ["urls"] })) {
        const u: any = entry.value; u.click_count = 0; await kv.set(entry.key, u);
    }
    return new Response(JSON.stringify({ success: true, message: "All Logs Cleared" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function handleShortenRequest(request: Request) { 
    try { 
        const { longUrl, customCode } = await request.json(); 
        if (!longUrl) return new Response(JSON.stringify({ error: 'longUrl is required' }), { status: 400 }); 

        let finalShortCode = customCode ? customCode.trim().replace(/\s+/g, '-') : generateShortCode(); 
        if (customCode) { 
            const existing = await kv.get(["urls", finalShortCode]);
            if (existing.value) return new Response(JSON.stringify({ error: 'Custom name taken.' }), { status: 409 }); 
        } 

        const record = { long_url: longUrl, short_code: finalShortCode, click_count: 0, created_at: new Date().toISOString() };
        await kv.set(["urls", finalShortCode], record);
        await incrementStat("total_links");
        
        return new Response(JSON.stringify(record), { headers: { 'Content-Type': 'application/json' } }); 
    } catch (e: any) { return new Response(JSON.stringify({ error: 'Failed: ' + e.message }), { status: 500 }); } 
}

async function handleUpdateRequest(request: Request, shortCode: string) { 
    const { long_url } = await request.json(); 
    const record = await kv.get(["urls", shortCode]);
    if (record.value) {
        (record.value as any).long_url = long_url;
        await kv.set(["urls", shortCode], record.value);
    }
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' }}); 
}

async function handleDeleteRequest(shortCode: string) { 
    await kv.delete(["urls", shortCode]);
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' }}); 
}

function generateShortCode(length = 7) { 
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; 
    let result = ''; for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length)); 
    return result; 
}

// ============================================================================
// 📊 DASHBOARD & ANALYTICS RENDERING
// ============================================================================
async function handleMainPageRequest(request: Request) { 
    try { 
        const origin = new URL(request.url).origin; 

        const totalLinks = await getStat("total_links");
        const totalClicks = await getStat("total_clicks");
        const totalOpens = await getStat("total_opens");
        const totalBotOpens = await getStat("total_bot_opens");
        const totalBotClicks = await getStat("total_bot_clicks");
        const totalUnsubscribes = await getStat("total_unsubscribes");

        const recentLinks = []; for await (const entry of kv.list({ prefix: ["urls"] })) recentLinks.push(entry.value);
        const openers = []; for await (const entry of kv.list({ prefix: ["opens"] }, { reverse: true, limit: 2500 })) openers.push(entry.value);
        const rawClicks = []; for await (const entry of kv.list({ prefix: ["clicks"] }, { reverse: true, limit: 2500 })) rawClicks.push(entry.value);
        const rawUnsubscribes = []; for await (const entry of kv.list({ prefix: ["unsubscribes"] }, { reverse: true, limit: 1000 })) rawUnsubscribes.push(entry.value);

        const uniqueClickSet = new Set();
        const clicksMap: any = {}; 
        const clickCountriesMap: any = {};
        
        rawClicks.forEach((c: any) => { 
            if (c.email && c.email !== 'Anonymous') {
                const e = c.email.trim().toLowerCase(); 
                uniqueClickSet.add(e);
                clicksMap[e] = (clicksMap[e] || 0) + 1;
                if (!clickCountriesMap[e]) { clickCountriesMap[e] = c.country; }
            }
        });
        const uniqueClicks = uniqueClickSet.size;

        const opensMap: any = {}; 
        openers.forEach((o: any) => { 
            if (o.email && o.email !== 'Anonymous') { 
                const e = o.email.trim().toLowerCase();
                opensMap[e] = (opensMap[e] || 0) + 1; 
            } 
        });

        const emailToProfile: any = {}; openers.forEach((op: any) => { if(op.email) emailToProfile[op.email] = op.profileName; });

        const rawOpensSafe = openers.map((o: any) => {
            let label = o.bot_reason || '🌐 Web Browser'; let ua = 'Unknown', asn = 'Unknown';
            try { if (o.bot_reason && o.bot_reason.startsWith('{')) { const parsed = JSON.parse(o.bot_reason); label = parsed.label; ua = parsed.ua; asn = parsed.asn; } } catch(e) {}
            return { date: o.openedAt, email: o.email, country: o.country || 'Unknown', profile: o.profileName || 'Unknown', isBot: o.is_bot == 1 || o.is_bot === true, ip: o.ip || '-', isp: o.isp || '-', bot_reason: label, raw_ua: ua, raw_asn: asn };
        });

        const rawClicksSafe = rawClicks.map((c: any) => {
            let label = c.bot_reason || '🌐 Web Browser'; let ua = 'Unknown', asn = 'Unknown';
            try { if (c.bot_reason && c.bot_reason.startsWith('{')) { const parsed = JSON.parse(c.bot_reason); label = parsed.label; ua = parsed.ua; asn = parsed.asn; } } catch(e) {}
            return { date: c.created_at, email: c.email || 'Anonymous', country: c.country || 'Unknown', os: c.os || 'Unknown', browser: c.browser || 'Unknown', profile: emailToProfile[c.email] || 'Unknown', isBot: c.is_bot == 1 || c.is_bot === true, ip: c.ip || '-', isp: c.isp || '-', short_code: c.short_code || 'Unknown', bot_reason: label, raw_ua: ua, raw_asn: asn };
        });

        const rawUnsubsSafe = rawUnsubscribes.map((u: any) => {
            let label = u.bot_reason || '🌐 Web Browser'; let ua = 'Unknown', asn = 'Unknown';
            try { if (u.bot_reason && u.bot_reason.startsWith('{')) { const parsed = JSON.parse(u.bot_reason); label = parsed.label; ua = parsed.ua; asn = parsed.asn; } } catch(e) {}
            return { date: u.created_at, email: u.email, profile: u.profileName || 'Unknown', country: u.country || 'Unknown', ip: u.ip || '-', isp: u.isp || '-', isBot: u.is_bot == 1 || u.is_bot === true, bot_reason: label, raw_ua: ua, raw_asn: asn };
        });

        const groupedOpensMap = new Map(); rawOpensSafe.forEach((op: any) => { const key = (op.email && op.email !== 'Anonymous') ? op.email.trim().toLowerCase() : `Anon-${op.date}`; if (!groupedOpensMap.has(key)) { groupedOpensMap.set(key, op); } });
        const uniqueGroupedOpens = Array.from(groupedOpensMap.values());

        const groupedClicksMap = new Map(); rawClicksSafe.forEach((c: any) => { const key = (c.email && c.email !== 'Anonymous') ? c.email.trim().toLowerCase() : `Anon-${c.date}`; if (!groupedClicksMap.has(key)) { groupedClicksMap.set(key, c); } });
        const uniqueGroupedClicks = Array.from(groupedClicksMap.values());

        let smartGlobalEvents: any[] = []; let seenEmails = new Set(); let seenBotOpenEmails = new Set(); let seenBotClickEmails = new Set();
        let allEvents: any[] = [];
        rawOpensSafe.forEach((op: any) => allEvents.push({ type: 'Open', time: op.date, email: op.email || 'Anonymous', country: op.country, ip: op.ip, isp: op.isp, source: `👁️ Profile: ${op.profile || 'Unknown'}`, device: '-', isBot: op.isBot, bot_reason: op.bot_reason, raw_ua: op.raw_ua, raw_asn: op.raw_asn }));
        rawClicksSafe.forEach((c: any) => allEvents.push({ type: 'Click', time: c.date, email: c.email || 'Anonymous', country: c.country, ip: c.ip, isp: c.isp, source: `🖱️ Link: ${c.short_code}`, device: `${c.os} / ${c.browser}`, isBot: c.isBot, bot_reason: c.bot_reason, raw_ua: c.raw_ua, raw_asn: c.raw_asn }));
        allEvents.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

        allEvents.forEach(e => {
            let identifier = (e.email && e.email !== 'Anonymous') ? e.email.trim().toLowerCase() : `Anon-${e.time}`;
            if (!seenEmails.has(identifier)) {
                seenEmails.add(identifier);
                const lookupEmail = (e.email && e.email !== 'Anonymous') ? e.email.trim().toLowerCase() : null;
                e.opens = lookupEmail ? (opensMap[lookupEmail] || 0) : 0;
                e.clicks = lookupEmail ? (clicksMap[lookupEmail] || 0) : 0;
                smartGlobalEvents.push(e);
            }
            if (e.isBot) { if (e.type === 'Open') { seenBotOpenEmails.add(identifier); } else if (e.type === 'Click') { seenBotClickEmails.add(identifier); } }
        });

        const trueUniqueUsers = new Set([...Object.keys(opensMap), ...Object.keys(clicksMap)]).size;

        const dynamicHtml = generateUnifiedDashboardHtml(recentLinks, uniqueGroupedOpens, smartGlobalEvents, uniqueGroupedClicks, rawOpensSafe, rawClicksSafe, rawUnsubsSafe, clicksMap, opensMap, clickCountriesMap, origin, totalLinks, totalClicks, uniqueClicks, totalOpens, totalBotOpens, seenBotOpenEmails.size, totalBotClicks, seenBotClickEmails.size, trueUniqueUsers, totalUnsubscribes); 
        return new Response(dynamicHtml, { headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'no-cache' } }); 
    } catch (error: any) { return new Response(`Error loading dashboard: ${error.message}`, { status: 500, headers: { 'Content-Type': 'text/plain' } }); } 
}

async function handleAnalyticsPageRequest(request: Request, shortCode: string) {
    try {
        const linkDataReq = await kv.get(["urls", shortCode]);
        if (!linkDataReq.value) return new Response('Link not found.', { status: 404 });
        const linkData: any = linkDataReq.value;

        const rawClicksSafe: any[] = []; 
        for await (const entry of kv.list({ prefix: ["clicks"] }, { reverse: true })) {
            const c: any = entry.value;
            if (c.short_code !== shortCode) continue;
            
            let label = c.bot_reason || '🌐 Web Browser'; let ua = 'Unknown'; let asn = 'Unknown';
            try { if (c.bot_reason && c.bot_reason.startsWith('{')) { const parsed = JSON.parse(c.bot_reason); label = parsed.label; ua = parsed.ua; asn = parsed.asn; } } catch(e) {}
            rawClicksSafe.push({ date: c.created_at, email: c.email || 'Anonymous', country: c.country || 'Unknown', os: c.os || 'Unknown', browser: c.browser || 'Unknown', isBot: c.is_bot == 1 || c.is_bot === true, ip: c.ip || '-', isp: c.isp || '-', bot_reason: label, raw_ua: ua, raw_asn: asn });
            
            if (rawClicksSafe.length >= 1000) break; 
        }

        const getUIBadgeInline = (label: string, rawUA: string, rawASN: string) => {
             let style = "";
            if (!label || label === 'null') { label = '👤 Human ✓'; style = "color:#28a745; font-weight:bold; font-size:0.85em; cursor:pointer;"; }
            else if (label.includes('Apple')) style = "background:#f3f4f6; color:#374151; border: 1px solid #d1d5db; padding:2px 6px; border-radius:4px; font-size:0.75em; white-space:nowrap; cursor:pointer;";
            else if (label.includes('Gmail')) style = "background:#fee2e2; color:#b91c1c; border: 1px solid #fca5a5; padding:2px 6px; border-radius:4px; font-size:0.75em; white-space:nowrap; cursor:pointer;";
            else if (label.includes('Yahoo')) style = "background:#f3e8ff; color:#7e22ce; border: 1px solid #d8b4fe; padding:2px 6px; border-radius:4px; font-size:0.75em; white-space:nowrap; cursor:pointer;";
            else if (label.includes('Scanner') || label.includes('Crawler') || label.includes('Trap')) style = "background:#fecaca; color:#991b1b; padding:2px 6px; border-radius:4px; font-size:0.75em; white-space:nowrap; cursor:pointer;";
            else style = "background:#e0f2fe; color:#0369a1; border: 1px solid #bae6fd; padding:2px 6px; border-radius:4px; font-size:0.75em; white-space:nowrap; cursor:pointer;";
            const safeUA = (rawUA || 'Unknown').replace(/'/g, "&#39;").replace(/"/g, "&quot;");
            const safeLabel = (label || 'Unknown').replace(/'/g, "&#39;").replace(/"/g, "&quot;");
            return `<span style="${style}" onclick="showRawData(event, '${safeLabel}', '${safeUA}', '${rawASN}')" title="Click to view Raw Request Data">${label}</span>`;
        };

        const clicksHtmlRows = rawClicksSafe.map((c, i) => {
            const date = new Date(c.date).toLocaleString('en-US', { timeZone: 'America/New_York' });
            const trStyle = c.isBot ? "background: #fff0f0;" : "";
            const statusBadge = c.isBot ? '<span style="color:#dc3545; font-weight:bold;">🤖 Bot</span>' : '<span style="color:#28a745; font-weight:bold;">👤 Human</span>';
            return `<tr style="${trStyle}"><td style="text-align:center;">${rawClicksSafe.length - i}</td><td>${date}</td><td><span style="color:#0056b3; font-weight:bold;">${c.email}</span></td><td><span style="font-family:monospace; color:#64748b; font-size:0.9em;">${c.ip || '-'}</span></td><td><span style="font-size:0.85em; color:#475569;">${c.isp || '-'}</span></td><td style="text-align:center;"><span style="color:#0ea5e9; font-weight:500;">🖱️ ${c.country}</span></td><td style="text-align:center;">${statusBadge}</td><td style="text-align:center;">${getUIBadgeInline(c.bot_reason, c.raw_ua, c.raw_asn)}</td></tr>`;
        }).join('') || '<tr><td colspan="8" style="text-align:center;">No clicks yet.</td></tr>';

        const pageHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Analytics: ${shortCode}</title><style>body { font-family: system-ui, sans-serif; background: #f4f7f9; margin: 0; padding: 2rem; color: #333; } .container { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,.1); max-width: 1400px; margin: auto; } table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.95em; } th, td { padding: 12px 10px; text-align: left; border-bottom: 1px solid #eee; } th { background: #f8f9fa; } .back-btn { background: #6c757d; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block; margin-bottom: 15px; } .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10005; align-items: center; justify-content: center; backdrop-filter: blur(2px); } .modal-content { background: #fff; padding: 20px; border-radius: 8px; width: 95%; max-width: 600px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 10px 25px rgba(0,0,0,0.2); } .close-btn { background: #dc3545; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; width: auto; float: right; }</style></head><body><div id="raw-data-modal" class="modal-overlay" onclick="closeRawModal(event)"><div class="modal-content" onclick="event.stopPropagation()"><div style="border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 10px;"><h2 style="margin:0; color:#10b981; display:inline-block;">📡 Raw Server Data</h2><button class="close-btn" onclick="closeRawModal(true)">Close</button></div><div id="raw-modal-body-content" style="overflow-y:auto;"></div></div></div><div class="container"><a href="${SECRET_DASHBOARD_PATH}" class="back-btn">&larr; Back to Dashboard</a><h2>Analytics for /${shortCode}</h2><p><strong>Destination:</strong> ${linkData.long_url}</p><p><strong>Total Clicks:</strong> ${rawClicksSafe.length}</p><div style="max-height: 700px; overflow-y: auto; border: 1px solid #eee; border-radius: 8px; margin-top:20px;"><table><thead><tr><th style="text-align:center;">#</th><th>Time</th><th>Email</th><th>IP Address</th><th>ISP</th><th style="text-align:center;">Location</th><th style="text-align:center;">Status</th><th style="text-align:center;">App / Client</th></tr></thead><tbody>${clicksHtmlRows}</tbody></table></div></div><script>function showRawData(event, label, ua, asn) { event.stopPropagation(); const body = document.getElementById('raw-modal-body-content'); const modal = document.getElementById('raw-data-modal'); body.innerHTML = \`<div style="background:#1e293b; color:#10b981; font-family:monospace; padding:15px; border-radius:8px; overflow-wrap: break-word;"><p style="margin:0 0 10px 0; color:#cbd5e1;">// THIS IS EXACTLY WHAT THE DEVICE SENT TO YOUR SERVER</p><p style="margin:0 0 5px 0;"><strong>Detected Label:</strong> \${label}</p><p style="margin:0 0 5px 0;"><strong>Provider ASN:</strong> \${asn}</p><p style="margin:0 0 5px 0;"><strong>Raw User-Agent:</strong><br>\${ua}</p></div>\`; modal.style.display = 'flex'; } function closeRawModal(force) { if (force === true || force.target === document.getElementById('raw-data-modal')) { document.getElementById('raw-data-modal').style.display = 'none'; } }</script></body></html>`;
        return new Response(pageHtml, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
    } catch (error) { return new Response('Error loading analytics: ' + String(error), { status: 500 }); }
}

// --- HTML TEMPLATES MAIN DASHBOARD ---
function generateUnifiedDashboardHtml(links: any, groupedOpeners: any, smartGlobalEvents: any, groupedAllClicks: any, rawOpensSafe: any, rawClicksSafe: any, rawUnsubsSafe: any, clicksMap: any, opensMap: any, clickCountriesMap: any, origin: any, totalLinks: any, totalClicks: any, uniqueClicks: any, totalOpens: any, totalBotOpens: any, uniqueBotOpens: any, totalBotClicks: any, uniqueBotClicks: any, trueUniqueUsers: any, totalUnsubscribes: any) { 
    const getUIBadge = (label: string, rawUA: string, rawASN: string) => {
        let style = "";
        if (!label || label === 'null') { label = '👤 Human ✓'; style = "color:#28a745; font-weight:bold; font-size:0.85em; cursor:pointer;"; }
        else if (label.includes('Apple')) style = "background:#f3f4f6; color:#374151; border: 1px solid #d1d5db; padding:2px 6px; border-radius:4px; font-size:0.75em; white-space:nowrap; cursor:pointer;";
        else if (label.includes('Gmail')) style = "background:#fee2e2; color:#b91c1c; border: 1px solid #fca5a5; padding:2px 6px; border-radius:4px; font-size:0.75em; white-space:nowrap; cursor:pointer;";
        else if (label.includes('Yahoo')) style = "background:#f3e8ff; color:#7e22ce; border: 1px solid #d8b4fe; padding:2px 6px; border-radius:4px; font-size:0.75em; white-space:nowrap; cursor:pointer;";
        else if (label.includes('Scanner') || label.includes('Crawler') || label.includes('Trap')) style = "background:#fecaca; color:#991b1b; padding:2px 6px; border-radius:4px; font-size:0.75em; white-space:nowrap; cursor:pointer;";
        else style = "background:#e0f2fe; color:#0369a1; border: 1px solid #bae6fd; padding:2px 6px; border-radius:4px; font-size:0.75em; white-space:nowrap; cursor:pointer;";
        const safeUA = (rawUA || 'Unknown').replace(/'/g, "&#39;").replace(/"/g, "&quot;");
        const safeLabel = (label || 'Unknown').replace(/'/g, "&#39;").replace(/"/g, "&quot;");
        return `<span style="${style}" onclick="showRawData(event, '${safeLabel}', '${safeUA}', '${rawASN}')" title="Click to view Raw Request Data">${label}</span>`;
    };

    const linksHtml = links.length > 0 ? links.map((link:any) => { 
        const shortUrl = `${origin}/${link.short_code}`; 
        const date = new Date(link.created_at).toLocaleDateString('en-US', { timeZone: 'America/New_York' }); 
        return `<div class="link-card" id="link-${link.short_code}"><div class="link-info"><p class="short-url">${shortUrl}</p><p class="long-url">${link.long_url}</p><p class="stats">Clicks: ${link.click_count || 0} &nbsp;|&nbsp; Created: ${date}</p></div><div class="link-actions"><button class="copy-btn" onclick="copyToClipboard('${shortUrl}')">Copy</button><a href="/analytics/${link.short_code}" class="analytics-btn">Analytics</a><button class="delete-btn" onclick="deleteLink('${link.short_code}')">Delete</button></div></div>`; 
    }).join('') : '<p style="text-align:center;">No links created yet.</p>';

    const totalUnsubsRows = rawUnsubsSafe.length;
    const unsubsHtml = totalUnsubsRows > 0 ? rawUnsubsSafe.map((u:any, index:any) => {
        const rowNum = totalUnsubsRows - index;
        const date = new Date(u.date).toLocaleString('en-US', { timeZone: 'America/New_York' });
        const trStyle = u.isBot ? "background: #fff0f0;" : "";
        const statusBadge = u.isBot ? '<span style="color:#dc3545; font-weight:bold;">🤖 Bot</span>' : '<span style="color:#28a745; font-weight:bold;">👤 Human</span>';
        const clientBadge = getUIBadge(u.bot_reason, u.raw_ua, u.raw_asn);
        return `<tr data-date="${u.date}" data-email="${u.email}" data-profile="${u.profile}" data-country="${u.country}" data-isbot="${u.isBot}" style="${trStyle}"><td style="font-weight:bold; color:#94a3b8; text-align:center;">${rowNum}</td><td style="text-align:center;">${statusBadge}</td><td>${date}</td><td><span style="color:#dc3545; font-weight:bold; font-size:0.9em;">${u.email}</span></td><td><span style="font-family:monospace; color:#64748b; font-size:0.9em;">${u.ip || '-'}</span></td><td><span style="font-size:0.85em; color:#475569;">${u.isp || '-'}</span></td><td style="text-align:center;"><span style="color:#4b5563; font-weight:500;">📍 ${u.country}</span></td><td>${u.profile}</td><td style="text-align:center;">${clientBadge}</td></tr>`;
    }).join('') : '<tr><td colspan="9" style="text-align:center;">No unsubscribes logged.</td></tr>';

    const totalGroupedOpeners = groupedOpeners.length;
    const openersHtml = groupedOpeners.length > 0 ? groupedOpeners.map((op:any, index:any) => {
        const rowNum = totalGroupedOpeners - index;
        const date = new Date(op.date).toLocaleString('en-US', { timeZone: 'America/New_York' });
        const lookupEmail = op.email && op.email !== 'Anonymous' ? op.email.trim().toLowerCase() : null;
        const userOpenCount = lookupEmail ? (opensMap[lookupEmail] || 1) : 1;
        const userClickCount = lookupEmail ? (clicksMap[lookupEmail] || 0) : 0;
        const clickCountry = lookupEmail ? clickCountriesMap[lookupEmail] : null;
        const isBotFlag = op.isBot;
        const trStyle = isBotFlag ? "background: #fff0f0;" : "";
        const statusBadge = isBotFlag ? '<span style="color:#dc3545; font-weight:bold;">🤖 Bot</span>' : '<span style="color:#28a745; font-weight:bold;">👤 Human</span>';
        const clientBadge = getUIBadge(op.bot_reason, op.raw_ua, op.raw_asn);
        const safeEmail = op.email && op.email !== 'Anonymous' ? op.email : '';
        const emailBadge = op.email && op.email !== 'Anonymous' ? `<span style="color:#0056b3; font-weight:bold; font-size:0.9em;">${op.email}</span>` : '<span style="color:#aaa;">Anonymous</span>';
        const openBadge = userOpenCount > 0 ? (safeEmail ? `<span class="clickable-badge" onclick="openDetailsModal('open', '${safeEmail}')" style="background:#d1fae5; color:#047857; border: 1px solid #a7f3d0; font-size:0.75em; font-weight:bold; padding:2px 8px; border-radius:12px;">${userOpenCount}</span>` : `<span style="background:#d1fae5; color:#047857; border: 1px solid #a7f3d0; font-size:0.75em; font-weight:bold; padding:2px 8px; border-radius:12px;">${userOpenCount}</span>`) : `<span style="color:#ccc; font-weight:bold;">0</span>`;
        const clickBadge = userClickCount > 0 ? (safeEmail ? `<span class="clickable-badge" onclick="openDetailsModal('click', '${safeEmail}')" style="background:#dbeafe; color:#1e40af; border: 1px solid #bfdbfe; font-size:0.75em; font-weight:bold; padding:2px 8px; border-radius:12px;">${userClickCount}</span>` : `<span style="background:#dbeafe; color:#1e40af; border: 1px solid #bfdbfe; font-size:0.75em; font-weight:bold; padding:2px 8px; border-radius:12px;">${userClickCount}</span>`) : `<span style="color:#ccc; font-weight:bold;">0</span>`;
        const openLoc = op.country ? `<span style="color:#047857; font-weight:500;">📍 ${op.country}</span>` : `<span style="color:#ccc;">-</span>`;
        const clickLoc = clickCountry ? `<span style="color:#0ea5e9; font-weight:500;">🖱️ ${clickCountry}</span>` : `<span style="color:#ccc;">-</span>`;
        
        return `<tr data-date="${op.date}" data-email="${op.email || ''}" data-profile="${op.profile || 'Unknown'}" data-country="${op.country || '-'}" data-isbot="${isBotFlag}" style="${trStyle}"><td style="font-weight:bold; color:#94a3b8; text-align:center;">${rowNum}</td><td style="text-align:center;">${statusBadge}</td><td>${date}</td><td>${emailBadge}</td><td><span style="font-family:monospace; color:#64748b; font-size:0.9em;">${op.ip || '-'}</span></td><td><span style="font-size:0.85em; color:#475569;">${op.isp || '-'}</span></td><td style="text-align:center;">${openBadge}</td><td style="text-align:center;">${clickBadge}</td><td style="text-align:center;">${openLoc}</td><td style="text-align:center;">${clickLoc}</td><td>${op.profile}</td><td style="text-align:center;">${clientBadge}</td></tr>`;
    }).join('') : '<tr><td colspan="12" style="text-align:center;">No opens tracked yet.</td></tr>';

    const totalGlobal = smartGlobalEvents.length;
    const globalHtml = smartGlobalEvents.length > 0 ? smartGlobalEvents.map((e:any, index:any) => {
        const rowNum = totalGlobal - index;
        const date = new Date(e.time).toLocaleString('en-US', { timeZone: 'America/New_York' });
        const trStyle = e.isBot ? "background: #fff0f0;" : "";
        const safeEmail = e.email !== 'Anonymous' ? e.email : '';
        const statusBadge = e.isBot ? '<span style="color:#dc3545; font-weight:bold;">🤖 Bot</span>' : '<span style="color:#28a745; font-weight:bold;">👤 Human</span>';
        const clientBadge = getUIBadge(e.bot_reason, e.raw_ua, e.raw_asn);
        const emailBadge = e.email !== 'Anonymous' ? `<span style="color:#374151; font-weight:bold; font-size:0.9em;">${e.email}</span>` : '<span style="color:#aaa;">Anonymous</span>';
        const openBadge = e.opens > 0 ? `<span class="clickable-badge" onclick="openDetailsModal('open', '${safeEmail}')" style="background:#d1fae5; color:#047857; border: 1px solid #a7f3d0; font-size:0.75em; font-weight:bold; padding:2px 8px; border-radius:12px;">${e.opens}</span>` : `<span style="color:#ccc; font-weight:bold;">0</span>`;
        const clickBadge = e.clicks > 0 ? `<span class="clickable-badge" onclick="openDetailsModal('click', '${safeEmail}')" style="background:#dbeafe; color:#1e40af; border: 1px solid #bfdbfe; font-size:0.75em; font-weight:bold; padding:2px 8px; border-radius:12px;">${e.clicks}</span>` : `<span style="color:#ccc; font-weight:bold;">0</span>`;

        return `<tr data-date="${e.time}" data-email="${safeEmail}" data-type="${e.type}" data-country="${e.country || '-'}" data-isbot="${e.isBot}" style="${trStyle}"><td style="font-weight:bold; color:#94a3b8; text-align:center;">${rowNum}</td><td style="text-align:center;">${statusBadge}</td><td>${date}</td><td>${emailBadge}</td><td><span style="font-family:monospace; color:#64748b; font-size:0.9em;">${e.ip || '-'}</span></td><td><span style="font-size:0.85em; color:#475569;">${e.isp || '-'}</span></td><td style="text-align:center;">${openBadge}</td><td style="text-align:center;">${clickBadge}</td><td><span style="font-size:0.85em; font-weight:bold; color:#0f172a;">${e.source}</span></td><td style="text-align:center;"><span style="color:#4b5563; font-weight:500;">📍 ${e.country}</span></td><td style="text-align:center;">${clientBadge}</td></tr>`;
    }).join('') : '<tr><td colspan="11" style="text-align:center;">No activity logged yet.</td></tr>';

    const totalGroupedClicks = groupedAllClicks.length;
    const allClicksHtml = totalGroupedClicks > 0 ? groupedAllClicks.map((c:any, index:any) => {
        const rowNum = totalGroupedClicks - index;
        const date = new Date(c.date).toLocaleString('en-US', { timeZone: 'America/New_York' });
        const lookupEmail = c.email && c.email !== 'Anonymous' ? c.email.trim().toLowerCase() : null;
        const userOpenCount = lookupEmail ? (opensMap[lookupEmail] || 0) : 0;
        const userClickCount = lookupEmail ? (clicksMap[lookupEmail] || 1) : 1;
        const isBotFlag = c.isBot;
        const trStyle = isBotFlag ? "background: #fff0f0;" : "";
        const safeEmail = c.email !== 'Anonymous' ? c.email : '';
        const statusBadge = isBotFlag ? '<span style="color:#dc3545; font-weight:bold;">🤖 Bot</span>' : '<span style="color:#28a745; font-weight:bold;">👤 Human</span>';
        const clientBadge = getUIBadge(c.bot_reason, c.raw_ua, c.raw_asn);
        const emailBadge = c.email !== 'Anonymous' ? `<span style="color:#0056b3; font-weight:bold; font-size:0.9em;">${c.email}</span>` : '<span style="color:#aaa;">Anonymous</span>';
        const openBadge = userOpenCount > 0 ? `<span class="clickable-badge" onclick="openDetailsModal('open', '${safeEmail}')" style="background:#d1fae5; color:#047857; border: 1px solid #a7f3d0; font-size:0.75em; font-weight:bold; padding:2px 8px; border-radius:12px;">${userOpenCount}</span>` : `<span style="color:#ccc; font-weight:bold;">0</span>`;
        const clickBadge = userClickCount > 0 ? `<span class="clickable-badge" onclick="openDetailsModal('click', '${safeEmail}')" style="background:#dbeafe; color:#1e40af; border: 1px solid #bfdbfe; font-size:0.75em; font-weight:bold; padding:2px 8px; border-radius:12px;">${userClickCount}</span>` : `<span style="color:#ccc; font-weight:bold;">0</span>`;

        return `<tr data-date="${c.date}" data-email="${safeEmail}" data-country="${c.country || '-'}" data-isbot="${isBotFlag}" style="${trStyle}"><td style="font-weight:bold; color:#94a3b8; text-align:center;">${rowNum}</td><td style="text-align:center;">${statusBadge}</td><td>${date}</td><td><a href="/analytics/${c.short_code}" style="color:#0ea5e9; font-weight:bold; text-decoration:none;">${c.short_code}</a></td><td>${emailBadge}</td><td><span style="font-family:monospace; color:#64748b; font-size:0.9em;">${c.ip || '-'}</span></td><td><span style="font-size:0.85em; color:#475569;">${c.isp || '-'}</span></td><td style="text-align:center;">${openBadge}</td><td style="text-align:center;">${clickBadge}</td><td style="text-align:center;"><span style="color:#0ea5e9; font-weight:500;">🖱️ ${c.country}</span></td><td style="text-align:center;">${clientBadge}</td></tr>`;
    }).join('') : '<tr><td colspan="11" style="text-align:center;">No clicks yet.</td></tr>';

    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Marketing Dashboard</title><script src="https://cdn.jsdelivr.net/npm/chart.js"></script><style>body { font-family: system-ui, sans-serif; background: #f4f7f9; margin: 0; padding: 2rem 0; color: #333; display: flex; flex-direction: column; align-items: center; } .container { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,.1); width: 98%; max-width: 1400px; margin-bottom: 2rem; } h1, h2 { margin-top: 0; } input, select { width: 100%; padding: .75rem; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; margin-bottom: 10px; } button { background: #007bff; color: white; padding: .75rem 1.5rem; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; width: 100%; } button:hover { background: #0056b3; } .summary-box { display: flex; justify-content: center; background: #f8f9fa; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; flex-wrap: wrap; gap: 15px; } .stat { text-align: center; min-width: 90px; padding: 10px; background: white; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border: 1px solid transparent;} .clickable-stat { cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease; } .clickable-stat:hover { transform: translateY(-3px); box-shadow: 0 6px 12px rgba(0,0,0,0.15); border-color: #007bff; } .stat-value { font-size: 1.5rem; font-weight: 700; color: #007bff; } .stat-label { font-size: .75rem; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px; } .link-card { border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; } .short-url { font-weight: bold; color: #0056b3; margin: 0 0 5px 0; } .long-url { font-size: .9em; color: #666; margin: 0 0 5px 0; word-break: break-all; } .stats { font-size: .85em; color: #888; margin: 0; } .link-actions { display: flex; gap: 5px; } .link-actions button, .link-actions a { padding: 6px 12px; font-size: 0.85rem; text-decoration: none; width: auto; } .copy-btn { background: #17a2b8; } .analytics-btn { background: #6c757d; color: white; } .delete-btn { background: #dc3545; } table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.95em; } th, td { padding: 12px 10px; text-align: left; border-bottom: 1px solid #eee; } th { background: #f8f9fa; cursor: pointer; user-select: none; white-space: nowrap; } th:hover { background: #e2e6ea; } #toast { visibility: hidden; min-width: 250px; background: #333; color: #fff; text-align: center; border-radius: 8px; padding: 16px; position: fixed; z-index: 10010; bottom: 30px; left: 50%; transform: translateX(-50%); } #toast.show { visibility: visible; } .filter-bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; background: #f8f9fa; padding: 10px; border-radius: 6px; margin-bottom: 1rem; } .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; } @media(max-width: 768px) { .charts-grid { grid-template-columns: 1fr; } } .chart-container { height: 300px; display: flex; justify-content: center; } .pagination-controls { display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px; } .clickable-badge { cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: transform 0.1s; display: inline-block; } .clickable-badge:hover { transform: scale(1.15); } .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 9999; align-items: center; justify-content: center; backdrop-filter: blur(2px); } .modal-content { background: #fff; padding: 20px; border-radius: 8px; width: 95%; max-width: 1400px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 10px 25px rgba(0,0,0,0.2); } .modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 10px; } .modal-body { overflow-y: auto; font-size: 0.9em; flex-grow: 1; } .close-btn { background: #dc3545; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; width: auto; } .close-btn:hover { background: #c82333; } select[multiple] { height: auto; min-height: 65px; vertical-align: middle; scrollbar-width: thin; } select[multiple] option { padding: 3px 5px; }</style></head><body><div id="toast">Message here</div><div id="details-modal" class="modal-overlay" onclick="closeModal(event)" style="z-index: 10005;"><div class="modal-content" style="max-width: 1000px; max-height: 85vh;" onclick="event.stopPropagation()"><div class="modal-header"><h2 id="modal-title" style="margin:0; color:#0056b3;">Details</h2><button class="close-btn" onclick="closeModal(true)">Close</button></div><div class="modal-body" id="modal-body-content"></div></div></div><div id="raw-data-modal" class="modal-overlay" onclick="closeRawModal(event)" style="z-index: 10005;"><div class="modal-content" onclick="event.stopPropagation()" style="max-width: 600px;"><div class="modal-header"><h2 style="margin:0; color:#10b981;">📡 Raw Server Data</h2><button class="close-btn" onclick="closeRawModal(true)">Close</button></div><div class="modal-body" id="raw-modal-body-content"></div></div></div><div id="table-modal" class="modal-overlay" onclick="closeTableModal(event)"><div class="modal-content" onclick="event.stopPropagation()"><div class="modal-header"><h2 id="table-modal-title" style="margin:0; color:#333;">Data View</h2><button class="close-btn" onclick="closeTableModal(true)">Close Data</button></div><div class="modal-body" id="table-modal-body"><div style="background:#e0f2fe; color:#0369a1; padding:10px; text-align:center; border-radius:6px; margin-bottom:10px; font-weight:bold;">Showing the Newest Records.</div><div id="unsub-section" style="display:none;"><div class="filter-bar"><input type="text" id="search-unsub" placeholder="🔍 Search emails..." oninput="applyFiltersUnsubs()" style="width:250px; margin:0; border: 2px solid #dc3545;"><span id="unsub-count" style="font-weight:bold; color:#b91c1c; background:#fee2e2; padding:6px 12px; border-radius:4px; margin-left:10px;"></span></div><div style="max-height: 600px; overflow-y: auto; border: 1px solid #eee; border-radius: 8px;"><table id="unsub-table"><thead><tr><th style="text-align:center;">#</th><th style="text-align:center;">Status</th><th>Unsubscribe Time</th><th>User Email</th><th>IP Address</th><th>ISP</th><th style="text-align:center;">Location</th><th>Profile</th><th style="text-align:center;">App / Client</th></tr></thead><tbody>${unsubsHtml}</tbody></table></div></div><div id="opens-section" style="display:none;"><div class="filter-bar"><input type="text" id="search-opens" placeholder="🔍 Search..." oninput="applyFiltersOpens()" style="width:250px; margin:0; border: 2px solid #007bff;"><span id="opens-count" style="font-weight:bold; color:#0ea5e9; background:#e0f2fe; padding:6px 12px; border-radius:4px; margin-left:10px;"></span></div><div style="max-height: 600px; overflow-y: auto; border: 1px solid #eee; border-radius: 8px;"><table id="opens-table"><thead><tr><th style="text-align:center;">#</th><th style="text-align:center;">Status</th><th>Latest Open</th><th>User Email</th><th>IP Address</th><th>ISP</th><th style="text-align:center;">Total Opens</th><th style="text-align:center;">Total Clicks</th><th style="text-align:center;">Open Loc</th><th style="text-align:center;">Click Loc</th><th>Profile</th><th style="text-align:center;">App / Client</th></tr></thead><tbody>${openersHtml}</tbody></table></div></div><div id="all-clicks-section" style="display:none;"><div class="filter-bar"><input type="text" id="search-all-clicks" placeholder="🔍 Search..." oninput="applyFiltersAllClicks()" style="width:250px; margin:0; border: 2px solid #007bff;"><span id="all-clicks-count" style="font-weight:bold; color:#0ea5e9; background:#e0f2fe; padding:6px 12px; border-radius:4px; margin-left:10px;"></span></div><div style="max-height: 600px; overflow-y: auto; border: 1px solid #eee; border-radius: 8px;"><table id="all-clicks-table"><thead><tr><th style="text-align:center;">#</th><th style="text-align:center;">Status</th><th>Latest Click Time</th><th>Latest Link</th><th>User Email</th><th>IP Address</th><th>ISP</th><th style="text-align:center;">Total Opens</th><th style="text-align:center;">Total Clicks</th><th style="text-align:center;">Location</th><th style="text-align:center;">App / Client</th></tr></thead><tbody>${allClicksHtml}</tbody></table></div></div><div id="global-section" style="display:none;"><div class="filter-bar"><input type="text" id="search-global" placeholder="🔍 Search..." oninput="applyFiltersGlobal()" style="width:250px; margin:0; border: 2px solid #007bff;"><span id="global-count" style="font-weight:bold; color:#0ea5e9; background:#e0f2fe; padding:6px 12px; border-radius:4px; margin-left:10px;"></span></div><div style="max-height: 700px; overflow-y: auto; border: 1px solid #eee; border-radius: 8px;"><table id="global-table"><thead><tr><th style="text-align:center;">#</th><th style="text-align:center;">Status</th><th>Latest Time</th><th>User Email</th><th>IP Address</th><th>ISP</th><th style="text-align:center;">Total Opens</th><th style="text-align:center;">Total Clicks</th><th>Latest Action</th><th style="text-align:center;">Location</th><th style="text-align:center;">App / Client</th></tr></thead><tbody>${globalHtml}</tbody></table></div></div></div></div></div><div class="container"><div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-bottom:1rem;"><h1 style="margin:0;">Marketing Engine (Deno KV)</h1><button onclick="clearAllLogs()" style="width:auto; background:#dc3545; padding:8px 16px;">🗑️ Clear All Logs</button></div><div class="summary-box"><div class="stat"><div class="stat-value">${totalLinks}</div><div class="stat-label">Active Links</div></div><div class="stat clickable-stat" onclick="openTableModal('all-clicks-section', 'Master Clicks Feed', 'ALL')"><div class="stat-value">${totalClicks}</div><div class="stat-label">Total Clicks</div></div><div class="stat clickable-stat" onclick="openTableModal('all-clicks-section', 'Master Clicks Feed', 'ALL')"><div class="stat-value" style="color:#20c997;">${uniqueClicks}</div><div class="stat-label">Unique Clicks</div></div><div class="stat clickable-stat" onclick="openTableModal('opens-section', 'User Engagement CRM', 'ALL')"><div class="stat-value">${totalOpens}</div><div class="stat-label">Total Opens</div></div><div class="stat clickable-stat" onclick="openTableModal('global-section', 'Smart Lead Stream', 'ALL')"><div class="stat-value">${trueUniqueUsers}</div><div class="stat-label">Unique Active Users</div></div><div class="stat clickable-stat" style="border-left: 2px solid #eee;" onclick="openTableModal('unsub-section', 'Unsubscribed Users', 'ALL')"><div class="stat-value" style="color:#dc3545;">${totalUnsubscribes}</div><div class="stat-label" style="font-weight:bold;">Unsubscribed</div></div></div><div id="links" style="width: 100%;"><form id="shorten-form" style="background:#f8f9fa; padding:1.5rem; border-radius:8px; margin-bottom:2rem;"><h3>Create New Trackable Link</h3><input type="url" id="long-url" required placeholder="Destination URL (e.g., https://example.com)"><input type="text" id="custom-code" placeholder="Custom Short Code (Optional)"><button type="submit" id="submit-btn">Shorten URL</button></form><h3>Your Links</h3>${linksHtml}</div></div><script>function openTableModal(sectionId, titleText, autoFilterType) { document.getElementById('table-modal-title').innerText = titleText; document.getElementById('opens-section').style.display = 'none'; document.getElementById('all-clicks-section').style.display = 'none'; document.getElementById('global-section').style.display = 'none'; document.getElementById('unsub-section').style.display = 'none'; document.getElementById(sectionId).style.display = 'block'; document.getElementById('table-modal').style.display = 'flex'; } function closeTableModal(force) { if (force === true || force.target === document.getElementById('table-modal')) document.getElementById('table-modal').style.display = 'none'; } function showRawData(event, label, ua, asn) { event.stopPropagation(); const body = document.getElementById('raw-modal-body-content'); const modal = document.getElementById('raw-data-modal'); body.innerHTML = \`<div style="background:#1e293b; color:#10b981; font-family:monospace; padding:15px; border-radius:8px; overflow-wrap: break-word;"><p style="margin:0 0 10px 0; color:#cbd5e1;">// THIS IS EXACTLY WHAT THE DEVICE SENT TO YOUR SERVER</p><p style="margin:0 0 5px 0;"><strong>Detected Label:</strong> \${label}</p><p style="margin:0 0 5px 0;"><strong>Provider ASN:</strong> \${asn}</p><p style="margin:0 0 5px 0;"><strong>Raw User-Agent:</strong><br>\${ua}</p></div>\`; modal.style.display = 'flex'; } function closeRawModal(force) { if (force === true || force.target === document.getElementById('raw-data-modal')) document.getElementById('raw-data-modal').style.display = 'none'; } const rawOpensData = ${JSON.stringify(rawOpensSafe)}; const rawClicksData = ${JSON.stringify(rawClicksSafe)}; function openDetailsModal(type, email) { const title = document.getElementById('modal-title'); const body = document.getElementById('modal-body-content'); const modal = document.getElementById('details-modal'); title.innerText = (type === 'open' ? '👁️ Open History' : '🖱️ Click History') + ' for ' + email; let html = '<table style="width:100%; border-collapse:collapse; text-align:left; font-size: 0.95em;"><thead><tr><th style="padding:10px; border-bottom:2px solid #ddd; background:#f8f9fa;">Time</th><th style="padding:10px; border-bottom:2px solid #ddd; background:#f8f9fa;">IP Address</th><th style="padding:10px; border-bottom:2px solid #ddd; background:#f8f9fa;">ISP</th><th style="padding:10px; border-bottom:2px solid #ddd; background:#f8f9fa;">Location</th><th style="padding:10px; border-bottom:2px solid #ddd; background:#f8f9fa;">App / Client</th><th style="padding:10px; border-bottom:2px solid #ddd; background:#f8f9fa; text-align:center;">Status</th></tr></thead><tbody>'; const dataSource = type === 'open' ? rawOpensData : rawClicksData; const filtered = dataSource.filter(d => d.email && d.email.trim().toLowerCase() === email.trim().toLowerCase()).sort((a,b) => new Date(b.date) - new Date(a.date)); if (filtered.length === 0) { html += '<tr><td colspan="6" style="text-align:center; padding:15px;">No data found.</td></tr>'; } else { filtered.forEach(d => { const date = new Date(d.date).toLocaleString('en-US', { timeZone: 'America/New_York' }); html += \`<tr style="\${d.isBot ? "background: #fff0f0;" : ""}"><td style="padding:10px; border-bottom:1px solid #eee;">\${date}</td><td style="padding:10px; border-bottom:1px solid #eee; font-family:monospace; color:#64748b;">\${d.ip || '-'}</td><td style="padding:10px; border-bottom:1px solid #eee; font-size:0.85em; color:#475569;">\${d.isp || '-'}</td><td style="padding:10px; border-bottom:1px solid #eee; font-weight:500;">\${d.country || '-'}</td><td style="padding:10px; border-bottom:1px solid #eee;">\${d.bot_reason || 'Human'}</td><td style="padding:10px; border-bottom:1px solid #eee; text-align:center;">\${d.isBot ? '🤖' : '👤'}</td></tr>\`; }); } html += '</tbody></table>'; body.innerHTML = html; modal.style.display = 'flex'; } function closeModal(force) { if (force === true || force.target === document.getElementById('details-modal')) document.getElementById('details-modal').style.display = 'none'; } function showToast(msg) { const t = document.getElementById("toast"); t.textContent = msg; t.className = "show"; setTimeout(() => t.className = t.className.replace("show", ""), 3000); } function copyToClipboard(text) { navigator.clipboard.writeText(text).then(() => showToast("Copied!")).catch(() => showToast("Failed to copy.")); } document.getElementById("shorten-form").addEventListener("submit", async e => { e.preventDefault(); const btn = document.getElementById("submit-btn"); btn.textContent = "Creating..."; btn.disabled = true; try { const res = await fetch("${SECRET_DASHBOARD_PATH}", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ longUrl: document.getElementById("long-url").value, customCode: document.getElementById("custom-code").value }) }); if(res.ok) { showToast("Link created! 🎉"); setTimeout(() => window.location.reload(), 1000); } else { const data = await res.json(); showToast("Error: " + (data.error || "Unknown")); } } catch(err) { showToast("Network error."); } btn.textContent = "Shorten URL"; btn.disabled = false; }); async function deleteLink(code) { if(!confirm("Permanently delete link?")) return; try { const res = await fetch(\`/api/links/\${code}\`, {method: "DELETE"}); if(res.ok) window.location.reload(); else showToast("Failed."); } catch(e) { showToast("Error."); } } async function clearAllLogs() { const pwd = prompt("Enter password to clear ALL tracking data:"); if (pwd !== 'password' && pwd !== 'pasword') { if (pwd !== null) showToast("Incorrect password!"); return; } try { const res = await fetch('/api/logs', { method: 'DELETE', headers: { 'x-tracking-secret': 'eygirl-secret-key-2026' }}); if(res.ok) { showToast("All data wiped!"); setTimeout(() => window.location.reload(), 1000); } else showToast("Failed."); } catch(e) { showToast("Error clearing logs."); } }</script></body></html>`;
}
