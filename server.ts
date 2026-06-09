import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import cron from "node-cron";

dotenv.config();

const DATA_DIR = path.join(process.cwd(), "data");
const NOTES_FILE = path.join(DATA_DIR, "published_notes.json");

async function ensureDataFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(NOTES_FILE);
  } catch {
    await fs.writeFile(NOTES_FILE, JSON.stringify([]));
  }
}

async function getPublishedNotes() {
  await ensureDataFile();
  const data = await fs.readFile(NOTES_FILE, "utf-8");
  return JSON.parse(data);
}

async function savePublishedNote(noteCode: string, title: string, content: string, language: string) {
  const notes = await getPublishedNotes();
  const newNote = {
    id: noteCode,
    title,
    content,
    language,
    date: new Date().toISOString(),
  };
  notes.unshift(newNote);
  await fs.writeFile(NOTES_FILE, JSON.stringify(notes));
}

async function generateAutoNoteForLanguage(ai: GoogleGenAI, language: string) {
  console.log(`Auto-generating daily notes for: ${language}...`);
  const prompt = `You are an expert UPSC Civil Services examination mentor and content creator.
Generate a highly structured and comprehensive current affairs update for the requested timeframe: Daily.
The output MUST be entirely in ${language}.

Analyze the latest content from the following prioritized sources: Press Information Bureau (PIB), The Hindu, and The Times of India.
CRITICAL REQUIREMENT 1: Only include news topics that have been covered by more than 5 major news outlets or have been highly repeated/trending across sources. Discard minor or single-source news.
CRITICAL REQUIREMENT 2: Focus on Indian national affairs AND highly repeated international news that is important according to the UPSC syllabus. Discard minor or single-source international news.

Please strictly organize your response according to the UPSC General Studies Syllabus (GS-I, GS-II, GS-III, GS-IV). For each relevant subject, provide the top news topics.

For each topic, format your output exactly like this:

## [Subject Name] (e.g., GS-II: Polity & Governance)
### [Topic Name]
- **Context/Source:** (Briefly mention the source, e.g., PIB or The Hindu)
- **Prelims Focus:** (Key facts, data points, or concepts for Prelims)
- **Mains Focus:** (Analytical points, pros/cons, implications for Mains)
- **PYQ Integration:** (Provide a related Previous Year Question from UPSC Prelims or Mains, or a high-quality mock if none exists, and briefly explain its relevance)
- **Practice MCQ:**
  - **Q:** [Question related to the topic]
  - **A)** [Option A]
  - **B)** [Option B]
  - **C)** [Option C]
  - **D)** [Option D]
  - **Correct Answer & Explanation:** [Answer letter] - [Brief explanation]

---COMMENT_BOX_PLACEHOLDER---

Provide detailed and accurate analysis. Use clean Markdown styling (bullet points, bold text). Ensure the entire response is in ${language}.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  return response.text;
}

async function startServer() {
  await ensureDataFile();
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Background Auto-Scheduler
  const runAutoScheduler = async () => {
    try {
      const todayDateStr = new Date().toISOString().split("T")[0];
      const englishId = `daily-en-${todayDateStr}`;
      const hindiId = `daily-hi-${todayDateStr}`;

      const notes = await getPublishedNotes();
      const hasEnglish = notes.some((n: any) => n.id === englishId);
      const hasHindi = notes.some((n: any) => n.id === hindiId);

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      if (!hasEnglish) {
        const content = await generateAutoNoteForLanguage(ai, "English");
        if (content) await savePublishedNote(englishId, `Daily Notes Compilation - ${todayDateStr}`, content, "English");
      }

      if (!hasHindi) {
        const content = await generateAutoNoteForLanguage(ai, "Hindi");
        if (content) await savePublishedNote(hindiId, `दैनिक करेंट अफेयर्स - ${todayDateStr}`, content, "Hindi");
      }

      console.log("Auto-scheduler check complete.");
    } catch (err) {
      console.error("Auto-scheduler error:", err);
    }
  };

  // Run at 06:00 AM every day
  cron.schedule("0 6 * * *", runAutoScheduler);
  
  // also run once on startup (so the user sees it immediately)
  setTimeout(runAutoScheduler, 5000);

  app.get("/api/published-notes", async (req, res) => {
    try {
      const notes = await getPublishedNotes();
      res.json(notes);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch published notes" });
    }
  });

  app.post("/api/current-affairs", async (req, res) => {
    try {
      const { timeframe, language } = req.body;
      
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `You are an expert UPSC Civil Services examination mentor and content creator.
Generate a highly structured and comprehensive current affairs update for the requested timeframe: ${timeframe}.
The output MUST be entirely in ${language}.

Analyze the latest content from the following prioritized sources: Press Information Bureau (PIB), The Hindu, and The Times of India.
CRITICAL REQUIREMENT 1: Only include news topics that have been covered by more than 5 major news outlets or have been highly repeated/trending across sources. Discard minor or single-source news.
CRITICAL REQUIREMENT 2: Focus on Indian national affairs AND highly repeated international news that is important according to the UPSC syllabus. Discard minor or single-source international news.

Please strictly organize your response according to the UPSC General Studies Syllabus (GS-I, GS-II, GS-III, GS-IV). For each relevant subject, provide the top news topics.

For each topic, format your output exactly like this:

## [Subject Name] (e.g., GS-II: Polity & Governance)
### [Topic Name]
- **Context/Source:** (Briefly mention the source, e.g., PIB or The Hindu)
- **Prelims Focus:** (Key facts, data points, or concepts for Prelims)
- **Mains Focus:** (Analytical points, pros/cons, implications for Mains)
- **PYQ Integration:** (Provide a related Previous Year Question from UPSC Prelims or Mains, or a high-quality mock if none exists, and briefly explain its relevance)
- **Practice MCQ:**
  - **Q:** [Question related to the topic]
  - **A)** [Option A]
  - **B)** [Option B]
  - **C)** [Option C]
  - **D)** [Option D]
  - **Correct Answer & Explanation:** [Answer letter] - [Brief explanation]

---COMMENT_BOX_PLACEHOLDER---

Provide detailed and accurate analysis. Use clean Markdown styling (bullet points, bold text). Ensure the entire response is in ${language}.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      res.json({ content: response.text });
    } catch (error: any) {
      console.error("Error generating current affairs:", error);
      res.status(500).json({ error: "Failed to generate current affairs.", details: error.message });
    }
  });

  app.post("/api/generate-quiz", async (req, res) => {
    try {
      const { timeframe, language } = req.body;
      
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `You are an expert UPSC Civil Services examination mentor and content creator.
Generate a multiple-choice quiz based on the latest current affairs for the requested timeframe: ${timeframe}.
The output MUST be in ${language}.

Sources to prioritize: Press Information Bureau (PIB), The Hindu, and The Times of India.

Include 5 multiple-choice questions (MCQs).
The output must STRICTLY follow this JSON schema, and it must contain ONLY the JSON with NO markdown wrapping, NO backticks, and NO conversational text:
{
  "title": "Quiz Title",
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": 0,
      "explanation": "Detailed explanation of why this option is correct."
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json"
        },
      });

      const content = response.text;
      if (!content) throw new Error("No content generated");
      res.json(JSON.parse(content));
    } catch (error: any) {
      console.error("Error generating quiz:", error);
      res.status(500).json({ error: "Failed to generate quiz.", details: error.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
