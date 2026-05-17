import { z } from "zod";
import { getOpenAIClient, MODEL } from "../openai";
import { logger } from "@/lib/logger";

export const questionSchema = z.object({
  question: z.string(),
  category: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  keywords: z.array(z.string()),
  followUpHints: z.array(z.string()),
});

export const questionSetSchema = z.array(questionSchema).min(5).max(10);

export const answerFeedbackSchema = z.object({
  score: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  missedKeywords: z.array(z.string()),
  starCompliance: z.boolean(),
  improvedAnswer: z.string().optional(),
  followUpQuestion: z.string().optional(),
});

export const interviewFeedbackSchema = z.object({
  overallScore: z.number().min(0).max(100),
  communicationScore: z.number().min(0).max(100),
  technicalScore: z.number().min(0).max(100),
  behavioralScore: z.number().min(0).max(100),
  topStrengths: z.array(z.string()).max(5),
  topWeaknesses: z.array(z.string()).max(5),
  improvements: z.array(z.string()).max(7),
  recommendedResources: z.array(z.string()).max(5),
  readyForInterview: z.boolean(),
  summary: z.string(),
});

export type InterviewQuestion = z.infer<typeof questionSchema>;
export type AnswerFeedback = z.infer<typeof answerFeedbackSchema>;
export type InterviewFeedback = z.infer<typeof interviewFeedbackSchema>;

interface GenerateQuestionsInput {
  interviewType: "HR" | "TECHNICAL" | "BEHAVIORAL" | "CASE_STUDY" | "SYSTEM_DESIGN";
  resumeText: string;
  jobTitle?: string;
  jobDescription?: string;
  userId: string;
}

interface ScoreAnswerInput {
  question: string;
  answer: string;
  interviewType: string;
  generateFollowUp: boolean;
  userId: string;
}

interface GenerateFeedbackInput {
  transcript: Array<{
    question: string;
    answer: string;
    score?: number;
    feedback?: string;
  }>;
  interviewType: string;
  userId: string;
}

class InterviewCoach {
  async generateQuestions(input: GenerateQuestionsInput): Promise<InterviewQuestion[]> {
    const client = getOpenAIClient();

    const typeGuide: Record<string, string> = {
      HR: "Focus on motivation, culture fit, career goals, salary expectations, work style",
      TECHNICAL: "Focus on technical skills, problem-solving, system design, coding patterns",
      BEHAVIORAL: "Use STAR method situations. Focus on leadership, conflict, teamwork, failure",
      CASE_STUDY: "Present business scenarios requiring structured problem analysis",
      SYSTEM_DESIGN: "High-level architecture design, scalability, trade-offs",
    };

    const response = await client.chat.completions.create({
      model: MODEL.GPT4O,
      messages: [
        {
          role: "system",
          content: `You are an expert interviewer at a top tech company. Generate realistic,
          challenging interview questions tailored to the candidate's experience.
          Type: ${input.interviewType} — ${typeGuide[input.interviewType]}`,
        },
        {
          role: "user",
          content: `
CANDIDATE RESUME:
${input.resumeText.slice(0, 3000)}

${input.jobTitle ? `TARGET ROLE: ${input.jobTitle}` : ""}
${input.jobDescription ? `JOB DESCRIPTION:\n${input.jobDescription.slice(0, 1500)}` : ""}

Generate 7 interview questions. Return JSON array:
[{
  "question": string,
  "category": string (subcategory),
  "difficulty": "easy"|"medium"|"hard",
  "keywords": string[] (what answer should include),
  "followUpHints": string[] (potential follow-up angles)
}]`,
        },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message.content;
    if (!content) throw new Error("Empty questions response");

    const raw = JSON.parse(content);
    const questions = Array.isArray(raw) ? raw : raw.questions ?? [];
    return questionSetSchema.parse(questions);
  }

  async scoreAnswer(input: ScoreAnswerInput): Promise<AnswerFeedback> {
    const client = getOpenAIClient();

    const response = await client.chat.completions.create({
      model: MODEL.GPT4O,
      messages: [
        {
          role: "system",
          content: `You are an expert interview coach. Score the candidate's answer honestly and constructively.
          Interview type: ${input.interviewType}
          Be specific — point to exact phrases that were strong or weak.`,
        },
        {
          role: "user",
          content: `
QUESTION: ${input.question}

CANDIDATE ANSWER: ${input.answer}

${input.generateFollowUp ? "Also generate a natural follow-up question based on their answer." : ""}

Return JSON:
{
  "score": number 0-100,
  "strengths": string[] (specific positive elements),
  "improvements": string[] (specific gaps),
  "missedKeywords": string[] (important concepts not mentioned),
  "starCompliance": boolean (did they use Situation/Task/Action/Result structure?),
  "improvedAnswer": string (how they could have answered better, 2-3 sentences),
  ${input.generateFollowUp ? '"followUpQuestion": string,' : ""}
}`,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message.content;
    if (!content) throw new Error("Empty scoring response");

    return answerFeedbackSchema.parse(JSON.parse(content));
  }

  async generateFinalFeedback(input: GenerateFeedbackInput): Promise<InterviewFeedback> {
    const client = getOpenAIClient();

    const transcriptSummary = input.transcript
      .map(
        (t, i) =>
          `Q${i + 1}: ${t.question}\nA: ${t.answer.slice(0, 300)}\nScore: ${t.score ?? "N/A"}`
      )
      .join("\n\n");

    const response = await client.chat.completions.create({
      model: MODEL.GPT4O,
      messages: [
        {
          role: "system",
          content: `You are a senior career coach providing post-interview analysis.
          Be honest, constructive, and actionable. The candidate needs real feedback to improve.`,
        },
        {
          role: "user",
          content: `
INTERVIEW TYPE: ${input.interviewType}
TRANSCRIPT SUMMARY:
${transcriptSummary}

Generate comprehensive feedback. Return JSON:
{
  "overallScore": number 0-100,
  "communicationScore": number 0-100,
  "technicalScore": number 0-100,
  "behavioralScore": number 0-100,
  "topStrengths": string[] max 5,
  "topWeaknesses": string[] max 5,
  "improvements": string[] max 7 specific actionable items,
  "recommendedResources": string[] max 5 (books, courses, practice sites),
  "readyForInterview": boolean,
  "summary": string (2-3 sentence overall assessment)
}`,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message.content;
    if (!content) throw new Error("Empty feedback response");

    return interviewFeedbackSchema.parse(JSON.parse(content));
  }
}

export const interviewCoach = new InterviewCoach();
