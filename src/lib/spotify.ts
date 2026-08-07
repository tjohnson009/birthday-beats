const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

let token: { value: string; expiresAt: number } | null = null;

if (!clientId || !clientSecret) {
    throw new Error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET");
}

export const getAccessToken = async () => {
    // check for fresh token
    if (token && Date.now() < token.expiresAt - 60000) { 
        return token.value;
    }

    // call spotify API with proper credentials
    const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        body: new URLSearchParams({
            grant_type: "client_credentials",
        }),
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
        },
    });

    if (!response.ok) {
        throw new Error(`Spotify token request failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();

    token = {
        value: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
    };
    return token.value;
}
