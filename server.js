
import 'dotenv/config';
import express from 'express';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3000;

const CLIENT_KEY = "awjvxz4l661csu9q";
const CLIENT_SECRET = "F9I19JySRKjZyeFBCLVtGULj068C8MhW";
const REDIRECT_URI = "https://tt-api.weisework.com/callback";

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/terms', (req, res) => {
    res.send('<h1>Terms of Service (TTData)</h1><p>This is a temporary page for API verification.</p>');
});

app.get('/privacy', (req, res) => {
    res.send('<h1>Privacy Policy (TTData)</h1><p>This is a temporary page for API verification.</p>');
});

app.get('/login', (req, res) => {
    const scopes = 'user.info.basic,user.info.profile,user.info.stats,video.list';
    const csrfState = Math.random().toString(36).substring(7);
    
    const url = 'https://www.tiktok.com/v2/auth/authorize/';
    const params = {
        client_key: CLIENT_KEY,
        scope: scopes,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        state: csrfState
    };
    
    const qs = new URLSearchParams(params).toString();
    res.redirect(`${url}?${qs}`);
});


app.get('/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send('Error: Authorization code not found.');

    try {        
        const tokenResp = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', new URLSearchParams({
            client_key: CLIENT_KEY,
            client_secret: CLIENT_SECRET,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: REDIRECT_URI
        }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

        const accessToken = tokenResp.data.access_token;
        const openId = tokenResp.data.open_id; 

        const userResp = await axios.get('https://open.tiktokapis.com/v2/user/info/', {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            params: { fields: 'display_name,avatar_url,follower_count,likes_count' }
        });

        const videoResp = await axios.post('https://open.tiktokapis.com/v2/video/list/', {
            max_count: 10,
            fields: [
                "title", "cover_image_url", "share_url", "create_time", 
                "view_count", "like_count", "comment_count", "share_count"
            ]
        }, {
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
        });

        res.status(200).json({
            status: "SUCCESS: Data Retrieved",
            user_id: openId,
            user_stats: userResp.data.data.user,
            video_metrics: videoResp.data.data.videos
        });

    } catch (error) {
        console.error("API Call Error:", error.response?.data || error.message);
        res.status(500).send(`Error processing request. Check server logs.`);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open in browser: ${REDIRECT_URI.replace('/callback', '/login')}`);
});