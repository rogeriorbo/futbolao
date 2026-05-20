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

const db = admin.firestore();

async function startServer() {
  const app = express();
  // Use CUSTOM_PORT if aapanel needs a different port (like 3001)
  const PORT = process.env.CUSTOM_PORT ? parseInt(process.env.CUSTOM_PORT) : 3000;

  app.use(express.json());

  // Health check to verify server is running and has the key
  app.get("/api/health", (req, res) => {
    const key = process.env.WC2026_API_KEY || process.env.API_FOOTBALL_KEY;
    res.json({
      status: "ok",
      hasApiKey: !!key,
      keyPrefix: key ? key.substring(0, 4) + "..." : "none",
      env: process.env.NODE_ENV,
    });
  });

  // Diagnostic endpoint to check what leagues are available/test connection
  app.get("/api/check-leagues", async (req, res) => {
    const apiKey = process.env.WC2026_API_KEY || process.env.API_FOOTBALL_KEY;
    if (!apiKey) return res.status(400).json({ error: "Missing API Key" });

    try {
      const response = await axios.get(`https://api.wc2026api.com/teams`, {
        headers: {
          "Authorization": `Bearer ${apiKey.trim()}`
        },
        timeout: 10000,
      });
      // Mock the old structure so the frontend doesn't break
      res.json({
        response: [
          {
            coverage: { fixtures: { events: true, statistics_fixtures: true } },
            league: { id: 1, name: "World Cup 2026" }
          }
        ],
        results: 1
      });
    } catch (error: any) {
      res.status(200).json({
        success: false,
        error: error.message,
        details: error.response?.data,
      });
    }
  });

  // Diagnostic endpoint to check teams
  app.get("/api/check-teams", async (req, res) => {
    const apiKey = process.env.WC2026_API_KEY || process.env.API_FOOTBALL_KEY;
    if (!apiKey) return res.status(400).json({ error: "Missing API Key" });

    try {
      const response = await axios.get(`https://api.wc2026api.com/teams`, {
        headers: {
          "Authorization": `Bearer ${apiKey.trim()}`
        },
        timeout: 10000,
      });
      res.json({
        response: response.data,
        results: response.data?.length || 0
      });
    } catch (error: any) {
      res
        .status(200)
        .json({
          success: false,
          error: error.message,
          details: error.response?.data,
        });
    }
  });

  // Diagnostic endpoint to check rounds
  app.get("/api/check-rounds", async (req, res) => {
    const apiKey = process.env.WC2026_API_KEY || process.env.API_FOOTBALL_KEY;
    if (!apiKey) return res.status(400).json({ error: "Missing API Key" });

    try {
      const response = await axios.get(`https://api.wc2026api.com/matches`, {
        headers: {
          "Authorization": `Bearer ${apiKey.trim()}`
        },
        timeout: 10000,
      });
      
      const matches = response.data || [];
      const rounds = Array.from(new Set(matches.map((m: any) => m.round)));
      
      res.json({
        response: rounds,
        results: rounds.length
      });
    } catch (error: any) {
      res
        .status(200)
        .json({
          success: false,
          error: error.message,
          details: error.response?.data,
        });
    }
  });

  // API Route for syncing teams
  app.get("/api/sync-teams", async (req, res) => {
    const apiKey = process.env.WC2026_API_KEY || process.env.API_FOOTBALL_KEY;
    if (!apiKey) return res.json({ success: false, error: "Missing API Key" });

    try {
      const response = await axios.get(`https://api.wc2026api.com/teams`, {
        headers: { "Authorization": `Bearer ${apiKey.trim()}` },
        timeout: 15000,
      });

      const teamItems = response.data;
      const batch = db.batch();

      for (const item of teamItems) {
        const teamRef = db.collection("teams").doc(item.id.toString());
        batch.set(
          teamRef,
          {
            ...item,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }

      await batch.commit();
      res.json({ success: true, message: `Synced ${teamItems.length} teams.` });
    } catch (error: any) {
      res.json({ success: false, error: error.message });
    }
  });

  // API Route for syncing standings
  app.get("/api/sync-standings", async (req, res) => {
    const apiKey = process.env.WC2026_API_KEY || process.env.API_FOOTBALL_KEY;
    if (!apiKey) return res.json({ success: false, error: "Missing API Key" });

    try {
      const response = await axios.get(`https://api.wc2026api.com/groups`, {
        headers: { "Authorization": `Bearer ${apiKey.trim()}` },
        timeout: 15000,
      });

      const groupsData = response.data;
      if (!groupsData || !Array.isArray(groupsData))
        return res.json({ success: false, error: "No standings data found / invalid format" });

      const batch = db.batch();
      for (const group of groupsData) {
        if (!group.letter) continue;
        const groupName = `Group ${group.letter}`;
        const groupRef = db.collection("standings").doc(groupName);
        batch.set(
          groupRef,
          {
            name: groupName,
            teams: group.teams || [], // Adjusting slightly, wc2026api likely returns teams array inside group
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }

      await batch.commit();
      res.json({
        success: true,
        message: `Synced ${groupsData.length} groups.`,
      });
    } catch (error: any) {
      res.json({ success: false, error: error.message });
    }
  });

  // API Route for syncing scores
  app.get("/api/sync-scores", async (req, res) => {
    let apiKey = process.env.WC2026_API_KEY || process.env.API_FOOTBALL_KEY;

    if (!apiKey) {
      console.error("Sync error: API key is missing");
      return res.json({
        success: false,
        error: "A chave API não foi configurada nos segredos do app.",
      });
    }

    apiKey = apiKey.trim();

    try {
      const response = await axios.get(`https://api.wc2026api.com/matches`, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "User-Agent": "BolaoCopa/1.0",
          Accept: "application/json",
        },
        timeout: 15000,
      });

      const fixtures = response.data;
      if (!fixtures || !Array.isArray(fixtures)) {
        return res.json({
          success: false,
          error: "Nenhum dado de jogo encontrado na resposta da API.",
          raw: response.data,
        });
      }

      const batch = db.batch();
      let updatedCount = 0;
      const updates: any[] = [];

      for (const fixture of fixtures) {
        const homeCode = fixture.home_team_code;
        const awayCode = fixture.away_team_code;

        if (!homeCode || !awayCode) continue;

        // Find match in our data by team codes
        const match = WORLD_CUP_2026_MATCHES.find(
          (m) =>
            (m.teamA === homeCode && m.teamB === awayCode) ||
            (m.teamA === awayCode && m.teamB === homeCode),
        );

        if (match) {
          const status = fixture.status; // 'scheduled', 'live', 'completed'
          const mappedStatus = status === 'completed' ? 'finished' : status;
          
          const scoreA =
            match.teamA === homeCode ? fixture.home_score : fixture.away_score;
          const scoreB =
            match.teamA === homeCode ? fixture.away_score : fixture.home_score;
            
          const penA = match.teamA === homeCode ? fixture.home_pen : fixture.away_pen;
          const penB = match.teamA === homeCode ? fixture.away_pen : fixture.home_pen;

          // Only update if it's live or finished and we have scores
          if (mappedStatus !== "scheduled" && scoreA !== null && scoreB !== null && scoreA !== undefined) {
            const resultRef = db.collection("results").doc(match.id);
            const updatePayload: any = {
              scoreA,
              scoreB,
              status: mappedStatus,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              apiFixtureId: fixture.id,
            };
            
            if (penA !== null && penA !== undefined) updatePayload.penA = penA;
            if (penB !== null && penB !== undefined) updatePayload.penB = penB;

            batch.set(
              resultRef,
              updatePayload,
              { merge: true },
            );

            updatedCount++;
            updates.push({
              matchId: match.id,
              teams: `${homeCode} x ${awayCode}`,
              score: `${scoreA}-${scoreB}`,
              status: mappedStatus,
            });
          }
        }
      }

      if (updatedCount > 0) {
        await batch.commit();
      }

      res.json({
        success: true,
        message: `Sync successful. Updated ${updatedCount} matches.`,
        updates,
      });
    } catch (error: any) {
      console.error("Sync error caught:", error.message);
      
      let errorMsg = `Erro na requisição: ${error.message}`;
      if (error.response?.status === 401) {
        errorMsg = "Chave de API inválida (401 Não Autorizado). Verifique se configurou WC2026_API_KEY corretamente nos segredos.";
      }
      
      res.json({
        success: false,
        error: errorMsg,
        details: error.response?.data || null,
      });
    }
  });

  // Force production mode if running from dist
  const isProd =
    process.env.NODE_ENV === "production" ||
    process.argv[1]?.endsWith("server.cjs");

  // Vite middleware for development
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
