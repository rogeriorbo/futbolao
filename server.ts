import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import admin from "firebase-admin";
import * as dotenv from "dotenv";

dotenv.config();

// Initialize Firebase Admin
// We use the config from the environment if available
const firebaseConfig = {
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
};

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      // In local dev, you might need a service account key
    });
  } catch (e) {
    // Fallback for environment where applicationDefault might not be set up yet
    admin.initializeApp();
  }
}

import { WORLD_CUP_2026_MATCHES } from "./src/data/matches";
import { API_FOOTBALL_TEAM_MAPPING } from "./src/data/apiMapping";

const db = admin.firestore();

// Helper to map API status to our app status
const mapStatus = (apiStatus: string) => {
  if (['FT', 'AET', 'PEN'].includes(apiStatus)) return 'finished';
  if (['1H', 'HT', '2H', 'ET', 'P', 'LIVE'].includes(apiStatus)) return 'live';
  return 'scheduled';
};

async function startServer() {
  const app = express();
  const PORT = process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT) : 3000;

  app.use(express.json());

  // Health check to verify server is running and has the key
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      hasApiKey: !!process.env.API_FOOTBALL_KEY,
      keyPrefix: process.env.API_FOOTBALL_KEY ? process.env.API_FOOTBALL_KEY.substring(0, 4) + "..." : "none",
      env: process.env.NODE_ENV
    });
  });

  // Diagnostic endpoint to check what leagues are available with this key
  app.get("/api/check-leagues", async (req, res) => {
    const apiKey = process.env.API_FOOTBALL_KEY;
    const season = req.query.season ? parseInt(req.query.season as string) : 2026;
    if (!apiKey) return res.status(400).json({ error: "Missing API Key" });

    try {
      const host = "v3.football.api-sports.io";
      const response = await axios.get(`https://${host}/leagues`, {
        params: { id: 1, season },
        headers: { 
          "x-apisports-key": apiKey.trim(),
          "x-apisports-host": host
        },
        timeout: 10000
      });
      res.json(response.data);
    } catch (error: any) {
      res.status(200).json({ 
        success: false, 
        error: error.message, 
        details: error.response?.data 
      });
    }
  });

  // Diagnostic endpoint to check teams
  app.get("/api/check-teams", async (req, res) => {
    const apiKey = process.env.API_FOOTBALL_KEY;
    const season = req.query.season ? parseInt(req.query.season as string) : 2026;
    if (!apiKey) return res.status(400).json({ error: "Missing API Key" });

    try {
      const host = "v3.football.api-sports.io";
      const response = await axios.get(`https://${host}/teams`, {
        params: { league: 1, season },
        headers: { 
          "x-apisports-key": apiKey.trim(),
          "x-apisports-host": host
        },
        timeout: 10000
      });
      res.json(response.data);
    } catch (error: any) {
      res.status(200).json({ success: false, error: error.message, details: error.response?.data });
    }
  });

  // Diagnostic endpoint to check rounds
  app.get("/api/check-rounds", async (req, res) => {
    const apiKey = process.env.API_FOOTBALL_KEY;
    const season = req.query.season ? parseInt(req.query.season as string) : 2026;
    if (!apiKey) return res.status(400).json({ error: "Missing API Key" });

    try {
      const host = "v3.football.api-sports.io";
      const response = await axios.get(`https://${host}/fixtures/rounds`, {
        params: { league: 1, season },
        headers: { 
          "x-apisports-key": apiKey.trim(),
          "x-apisports-host": host
        },
        timeout: 10000
      });
      res.json(response.data);
    } catch (error: any) {
      res.status(200).json({ success: false, error: error.message, details: error.response?.data });
    }
  });

  // API Route for syncing teams
  app.get("/api/sync-teams", async (req, res) => {
    const apiKey = process.env.API_FOOTBALL_KEY;
    const season = req.query.season ? parseInt(req.query.season as string) : 2026;
    if (!apiKey) return res.json({ success: false, error: "Missing API Key" });

    try {
      const host = "v3.football.api-sports.io";
      const response = await axios.get(`https://${host}/teams`, {
        params: { league: 1, season },
        headers: { "x-apisports-key": apiKey.trim(), "x-apisports-host": host },
        timeout: 15000
      });

      if (response.data.errors && (Array.isArray(response.data.errors) ? response.data.errors.length > 0 : Object.keys(response.data.errors).length > 0)) {
        const errorStr = JSON.stringify(response.data.errors).toLowerCase();
        if (errorStr.includes("rate") || errorStr.includes("limit")) {
          return res.json({ success: false, error: "Aguarde um minuto para atualizar os dados novamente.", details: response.data.errors });
        }
        return res.json({ success: false, error: "API Error", details: response.data.errors });
      }

      const teamItems = response.data.response;
      const batch = db.batch();
      
      for (const item of teamItems) {
        const teamRef = db.collection('teams').doc(item.team.id.toString());
        batch.set(teamRef, {
          ...item.team,
          venue: item.venue,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }

      await batch.commit();
      res.json({ success: true, message: `Synced ${teamItems.length} teams.` });
    } catch (error: any) {
      res.json({ success: false, error: error.message });
    }
  });

  // API Route for syncing standings
  app.get("/api/sync-standings", async (req, res) => {
    const apiKey = process.env.API_FOOTBALL_KEY;
    const season = req.query.season ? parseInt(req.query.season as string) : 2026;
    if (!apiKey) return res.json({ success: false, error: "Missing API Key" });

    try {
      const host = "v3.football.api-sports.io";
      const response = await axios.get(`https://${host}/standings`, {
        params: { league: 1, season },
        headers: { "x-apisports-key": apiKey.trim(), "x-apisports-host": host },
        timeout: 15000
      });

      if (response.data.errors && (Array.isArray(response.data.errors) ? response.data.errors.length > 0 : Object.keys(response.data.errors).length > 0)) {
        const errorStr = JSON.stringify(response.data.errors).toLowerCase();
        if (errorStr.includes("rate") || errorStr.includes("limit")) {
          return res.json({ success: false, error: "Aguarde um minuto para atualizar os dados novamente.", details: response.data.errors });
        }
        return res.json({ success: false, error: "API Error", details: response.data.errors });
      }

      const standingsData = response.data.response[0]?.league?.standings;
      if (!standingsData) return res.json({ success: false, error: "No standings data found" });

      const batch = db.batch();
      // Flatten groups into a single collection or nested? 
      // API returns an array of arrays (one for each group)
      for (const group of standingsData) {
        if (!group.length) continue;
        const groupName = group[0].group;
        const groupRef = db.collection('standings').doc(groupName);
        batch.set(groupRef, {
          name: groupName,
          teams: group,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }

      await batch.commit();
      res.json({ success: true, message: `Synced ${standingsData.length} groups.` });
    } catch (error: any) {
      res.json({ success: false, error: error.message });
    }
  });

  // API Route for syncing scores
  app.get("/api/sync-scores", async (req, res) => {
    let apiKey = process.env.API_FOOTBALL_KEY;
    const season = req.query.season ? parseInt(req.query.season as string) : 2026;
    
    if (!apiKey) {
      console.error("Sync error: API_FOOTBALL_KEY is missing");
      return res.json({ 
        success: false,
        error: "A chave API_FOOTBALL_KEY não foi configurada nos segredos do app." 
      });
    }

    apiKey = apiKey.trim();

    console.log(`Starting sync for League 1 (World Cup), Season ${season}...`);
    console.log(`Key info: length=${apiKey.length}, startsWith=${apiKey.substring(0, 4)}`);

    try {
      // Trying the direct API-Sports host first. 
      const host = "v3.football.api-sports.io";
      
      console.log(`Calling API-Sports: https://${host}/fixtures?league=1&season=${season}`);
      
      const response = await axios.get(`https://${host}/fixtures`, {
        params: {
          league: 1,
          season: season
        },
        headers: {
          "x-apisports-key": apiKey,
          "x-apisports-host": host,
          "User-Agent": "BolaoCopa/1.0",
          "Accept": "application/json"
        },
        timeout: 15000 
      });

      // API-Football returns errors inside 200 OK
      const apiErrors = response.data.errors;
      const hasErrors = apiErrors && (Array.isArray(apiErrors) ? apiErrors.length > 0 : Object.keys(apiErrors).length > 0);

      if (hasErrors) {
        console.error("API-Sports error detected:", JSON.stringify(apiErrors));
        
        let customError = "O provedor da API retornou um erro.";
        const errorStr = JSON.stringify(apiErrors).toLowerCase();
        
        if (errorStr.includes("season") || errorStr.includes("plan")) {
          // If they are trying 2026 and get a plan error, be very specific
          if (season === 2026) {
             customError = "Seu plano (Free ou Iniciante) não suporta a Copa 2026. Altere para 2022 nas configurações de diagnóstico para testar a sincronização com dados reais.";
          } else {
             customError = `Seu plano não tem acesso à temporada ${season}.`;
          }
        } else if (errorStr.includes("rate") || errorStr.includes("limit")) {
          customError = "Aguarde um minuto para atualizar os dados novamente.";
        } else if (errorStr.includes("key") || errorStr.includes("token")) {
          customError = "Chave de API inválida. Verifique se a chave foi inserida corretamente nos segredos.";
        } else if (errorStr.includes("access")) {
          customError = "Seu plano da API não tem acesso a esses dados.";
        }

        return res.json({ 
          success: false, 
          error: customError, 
          details: apiErrors 
        });
      }

      const fixtures = response.data.response;
      if (!fixtures || !Array.isArray(fixtures)) {
        return res.json({ 
          success: false, 
          error: "Nenhum dado de jogo encontrado na resposta da API.", 
          raw: response.data 
        });
      }

      const batch = db.batch();
      let updatedCount = 0;
      const updates: any[] = [];

      for (const fixture of fixtures) {
        const homeName = fixture.teams.home.name;
        const awayName = fixture.teams.away.name;
        const homeCode = API_FOOTBALL_TEAM_MAPPING[homeName];
        const awayCode = API_FOOTBALL_TEAM_MAPPING[awayName];

        if (!homeCode || !awayCode) continue;

        // Find match in our data
        // We match by team codes. In World Cup group stage, teams only play each other once.
        // For knockout rounds, we might need date matching too.
        const match = WORLD_CUP_2026_MATCHES.find(m => 
          (m.teamA === homeCode && m.teamB === awayCode) || 
          (m.teamA === awayCode && m.teamB === homeCode)
        );

        if (match) {
          const status = mapStatus(fixture.fixture.status.short);
          const scoreA = match.teamA === homeCode ? fixture.goals.home : fixture.goals.away;
          const scoreB = match.teamA === homeCode ? fixture.goals.away : fixture.goals.home;

          // Only update if it's live or finished and we have scores
          if (status !== 'scheduled' && scoreA !== null && scoreB !== null) {
            const resultRef = db.collection('results').doc(match.id);
            batch.set(resultRef, {
              scoreA,
              scoreB,
              status,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              apiFixtureId: fixture.fixture.id
            }, { merge: true });
            
            updatedCount++;
            updates.push({ matchId: match.id, teams: `${homeCode} x ${awayCode}`, score: `${scoreA}-${scoreB}`, status });
          }
        }
      }

      if (updatedCount > 0) {
        await batch.commit();
      }

      res.json({ 
        success: true,
        message: `Sync successful. Updated ${updatedCount} matches.`, 
        updates
      });
    } catch (error: any) {
      console.error("Sync error caught:", error.message);
      let details = null;
      let errorMsg = `Erro na requisição: ${error.message}`;

      if (error.response) {
        // If the error response itself is HTML, don't return the whole HTML string
        const contentType = error.response.headers?.['content-type'] || '';
        if (contentType.includes('text/html')) {
          details = "A API retornou uma página HTML de erro (provavelmente 403 Forbidden). Isso acontece quando o WAF da API bloqueia a requisição.";
          errorMsg = "Acesso negado pela API (403 Forbidden). Verifique sua chave e plano.";
        } else {
          details = error.response.data;
        }
        console.error("Error response details:", details);
      }
      
      // ALWAYS return 200 to avoid platform intervention with HTML pages
      res.json({ 
        success: false, 
        error: errorMsg, 
        details: details
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
