const BASE = "/api";

// ---------- Token management ----------

let authToken: string | null = localStorage.getItem("token");

export function setToken(token: string | null): void {
  authToken = token;
  if (token) {
    localStorage.setItem("token", token);
  } else {
    localStorage.removeItem("token");
  }
}

export function getToken(): string | null {
  return authToken;
}

// ---------- Types ----------

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  has_completed_onboarding: boolean;
  created_at: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Skill {
  id: number;
  name: string;
  category: string;
  level: string | null;
}

export interface Experience {
  id: number;
  title: string;
  description: string | null;
  technologies: string | null;
  client: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface Education {
  id: number;
  school: string;
  degree: string;
  field: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface Language {
  id: number;
  language: string;
  level: string;
}

export interface Extracurricular {
  id: number;
  name: string;
  description: string | null;
}

export interface Offer {
  id: number;
  company: string;
  title: string;
  description: string | null;
  link: string | null;
  locations: string | null;
  date_applied: string | null;
  status: string;
  created_at: string | null;
}

export interface CV {
  id: number;
  name: string;
  content: string;
  latex_content: string | null;
  file_path: string | null;
  support_files_dir: string | null;
  company: string | null;
  job_title: string | null;
  offer_id: number | null;
  is_adapted: boolean;
  is_default: boolean;
  created_at: string | null;
}

export interface Template {
  id: number;
  name: string;
  content: string;
  file_path: string | null;
  created_at: string | null;
}

export interface SkillGapResult {
  id: number;
  offer_title: string;
  company: string;
  missing_hard_skills: string[];
  missing_soft_skills: string[];
  recommendations: string[];
}

export interface CoverLetterResult {
  id: number;
  offer_title: string;
  company: string;
  cover_letter: string;
}

export interface StoredCoverLetter {
  id: number;
  offer_id: number | null;
  template_id: number | null;
  name: string | null;
  offer_title: string | null;
  company: string | null;
  content: string;
  saved: boolean;
  created_at: string | null;
}

export interface StoredSkillGap {
  id: number;
  offer_id: number;
  offer_title: string;
  company: string;
  missing_hard_skills: string[];
  missing_soft_skills: string[];
  recommendations: string[];
  created_at: string | null;
}

export interface AdaptCVLatexResult {
  original_latex: string;
  adapted_latex: string;
  offer_title: string;
  company: string;
  support_files_dir: string | null;
}

export interface CVSuggestionsResult {
  id: number | null;
  cv_id: number | null;
  score: number;
  suggested_title: string | null;
  suggested_profile: string | null;
  other_suggestions: string[];
  offer_title: string;
  company: string;
}

export interface StoredCVOfferAnalysis {
  id: number;
  offer_id: number;
  cv_id: number;
  offer_title: string;
  company: string;
  score: number;
  suggested_title: string | null;
  suggested_profile: string | null;
  other_suggestions: string[];
  created_at: string | null;
}

export interface CVAnalysisResult {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
}

export interface StoredCVAnalysis {
  id: number;
  cv_id: number;
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  created_at: string | null;
}

export interface ParsedOffer {
  company: string;
  title: string;
  locations: string | null;
  description: string | null;
}

export interface AutoFillResult {
  skills: { name: string; category: string }[];
  experiences: { title: string; description?: string; technologies?: string; client?: string }[];
  education: { school: string; degree: string; field?: string; description?: string }[];
  languages: { language: string; level: string }[];
  extracurriculars: { name: string; description?: string }[];
}

// ---------- Generic helpers ----------

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  return headers;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: authHeaders(),
    ...options,
  });
  if (res.status === 401) {
    // Dispatch event so useAutosave hooks can backup drafts to localStorage
    window.dispatchEvent(new Event("session-expired"));
    setToken(null);
    window.location.href = "/";
    throw new Error("Session expired");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

/** fetch with auth header for FormData (no Content-Type — browser sets multipart boundary). */
async function fetchWithAuth(url: string, options: RequestInit): Promise<Response> {
  const headers: Record<string, string> = {};
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  return fetch(url, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> || {}) },
  });
}

// ---------- Auth ----------

export const register = (name: string, email: string, password: string) =>
  request<TokenResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });

export const login = (email: string, password: string) =>
  request<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const getMe = () => request<User>("/auth/me");

export const completeOnboarding = () =>
  request<{ detail: string }>("/auth/complete-onboarding", { method: "PATCH" });

// ---------- Users ----------

export const getUser = (id: number) => request<User>(`/users/${id}`);

export const getUserByEmail = (email: string) =>
  request<User>(`/users/by-email/${encodeURIComponent(email)}`);

// ---------- AI Instructions ----------

export interface AIInstructions {
  ai_instructions: string | null;
}

export const getAIInstructions = (uid: number) =>
  request<AIInstructions>(`/users/${uid}/ai-instructions`);

export const updateAIInstructions = (uid: number, ai_instructions: string) =>
  request<AIInstructions>(`/users/${uid}/ai-instructions`, {
    method: "PUT",
    body: JSON.stringify({ ai_instructions }),
  });

// ---------- Profile ----------

export const getSkills = (uid: number) =>
  request<Skill[]>(`/users/${uid}/skills`);

export const addSkill = (uid: number, data: { name: string; category?: string; level?: string }) =>
  request<Skill>(`/users/${uid}/skills`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateSkill = (uid: number, id: number, data: { name?: string; category?: string; level?: string }) =>
  request<Skill>(`/users/${uid}/skills/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deleteSkill = (uid: number, id: number) =>
  request<void>(`/users/${uid}/skills/${id}`, { method: "DELETE" });

export const getExperiences = (uid: number) =>
  request<Experience[]>(`/users/${uid}/experiences`);

export const addExperience = (uid: number, data: {
  title: string; description?: string; technologies?: string;
  client?: string; start_date?: string; end_date?: string;
}) =>
  request<Experience>(`/users/${uid}/experiences`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateExperience = (uid: number, id: number, data: {
  title?: string; description?: string; technologies?: string;
  client?: string; start_date?: string; end_date?: string;
}) =>
  request<Experience>(`/users/${uid}/experiences/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deleteExperience = (uid: number, id: number) =>
  request<void>(`/users/${uid}/experiences/${id}`, { method: "DELETE" });

export const getEducation = (uid: number) =>
  request<Education[]>(`/users/${uid}/education`);

export const addEducation = (uid: number, data: {
  school: string; degree: string; field?: string;
  description?: string; start_date?: string; end_date?: string;
}) =>
  request<Education>(`/users/${uid}/education`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateEducation = (uid: number, id: number, data: {
  school?: string; degree?: string; field?: string;
  description?: string; start_date?: string; end_date?: string;
}) =>
  request<Education>(`/users/${uid}/education/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deleteEducation = (uid: number, id: number) =>
  request<void>(`/users/${uid}/education/${id}`, { method: "DELETE" });

export const getLanguages = (uid: number) =>
  request<Language[]>(`/users/${uid}/languages`);

export const addLanguage = (uid: number, data: { language: string; level: string }) =>
  request<Language>(`/users/${uid}/languages`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateLanguage = (uid: number, id: number, data: { language?: string; level?: string }) =>
  request<Language>(`/users/${uid}/languages/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deleteLanguage = (uid: number, id: number) =>
  request<void>(`/users/${uid}/languages/${id}`, { method: "DELETE" });

export const getExtracurriculars = (uid: number) =>
  request<Extracurricular[]>(`/users/${uid}/extracurriculars`);

export const addExtracurricular = (uid: number, data: { name: string; description?: string }) =>
  request<Extracurricular>(`/users/${uid}/extracurriculars`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateExtracurricular = (uid: number, id: number, data: { name?: string; description?: string }) =>
  request<Extracurricular>(`/users/${uid}/extracurriculars/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deleteExtracurricular = (uid: number, id: number) =>
  request<void>(`/users/${uid}/extracurriculars/${id}`, { method: "DELETE" });

export const clearProfile = (uid: number) =>
  request<void>(`/users/${uid}/profile`, { method: "DELETE" });

// ---------- Offers ----------

export const getOffers = (uid: number, status?: string, limit = 100, offset = 0) => {
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  qs.set("limit", String(limit));
  qs.set("offset", String(offset));
  return request<PaginatedResponse<Offer>>(`/users/${uid}/offers?${qs}`);
};

export const getOffer = (uid: number, id: number) =>
  request<Offer>(`/users/${uid}/offers/${id}`);

export const createOffer = (uid: number, data: {
  company: string; title: string; description?: string;
  link?: string; locations?: string; status?: string;
}) =>
  request<Offer>(`/users/${uid}/offers`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateOffer = (uid: number, id: number, data: {
  company?: string; title?: string; status?: string;
  date_applied?: string; link?: string; locations?: string; description?: string;
}) =>
  request<Offer>(`/users/${uid}/offers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deleteOffer = (uid: number, id: number) =>
  request<void>(`/users/${uid}/offers/${id}`, { method: "DELETE" });

// ---------- CVs ----------

export const getCVs = (uid: number, limit = 100, offset = 0) =>
  request<PaginatedResponse<CV>>(`/users/${uid}/cvs?limit=${limit}&offset=${offset}`);

export const createCV = (uid: number, data: {
  name?: string; content: string; latex_content?: string;
  company?: string; job_title?: string; offer_id?: number;
}) =>
  request<CV>(`/users/${uid}/cvs`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const uploadCVFile = async (uid: number, file: File, name: string, company: string, jobTitle: string): Promise<CV> => {
  const form = new FormData();
  form.append("file", file);
  form.append("name", name);
  form.append("company", company);
  form.append("job_title", jobTitle);
  const res = await fetchWithAuth(`${BASE}/users/${uid}/cvs/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.json();
};

export const updateCV = (uid: number, id: number, data: {
  name?: string; latex_content?: string; company?: string; job_title?: string;
}) =>
  request<CV>(`/users/${uid}/cvs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export interface ChatEditCVResponse {
  updated_latex: string;
}

export const chatEditCV = (uid: number, cvId: number, message: string, conversationHistory?: { role: string; content: string }[]) =>
  request<ChatEditCVResponse>(`/users/${uid}/cvs/${cvId}/chat-edit`, {
    method: "POST",
    body: JSON.stringify({ message, conversation_history: conversationHistory ?? null }),
  });

export const deleteCV = (uid: number, id: number) =>
  request<void>(`/users/${uid}/cvs/${id}`, { method: "DELETE" });

export const toggleDefaultCV = (uid: number, cvId: number) =>
  request<CV>(`/users/${uid}/cvs/${cvId}/toggle-default`, { method: "POST" });

export const analyzeCVGeneral = (uid: number, cvId: number) =>
  request<CVAnalysisResult>(`/users/${uid}/cvs/${cvId}/analyze`, { method: "POST" });

export const getStoredCVAnalyses = (uid: number) =>
  request<StoredCVAnalysis[]>(`/users/${uid}/cv-analyses`);

export const getStoredCVOfferAnalyses = (uid: number) =>
  request<StoredCVOfferAnalysis[]>(`/users/${uid}/cv-offer-analyses`);

export const downloadCVUrl = (uid: number, id: number) =>
  `${BASE}/users/${uid}/cvs/${id}/download`;

export const downloadCVBlob = async (uid: number, id: number): Promise<Blob> => {
  const res = await fetchWithAuth(`${BASE}/users/${uid}/cvs/${id}/download`, {
    method: "GET",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.blob();
};

export const compileCVUrl = (uid: number, id: number) =>
  `${BASE}/users/${uid}/cvs/${id}/compile-pdf`;

// ---------- Templates ----------

export const getTemplates = (uid: number, limit = 100, offset = 0) =>
  request<PaginatedResponse<Template>>(`/users/${uid}/templates?limit=${limit}&offset=${offset}`);

export const createTemplate = (uid: number, data: { name: string; content: string }) =>
  request<Template>(`/users/${uid}/templates`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const deleteTemplate = (uid: number, id: number) =>
  request<void>(`/users/${uid}/templates/${id}`, { method: "DELETE" });

// ---------- AI ----------

export const analyzeSkillGap = (uid: number, offerId: number) =>
  request<SkillGapResult>(`/users/${uid}/offers/${offerId}/skill-gap`, {
    method: "POST",
  });

export const generateCoverLetter = (uid: number, offerId: number, opts?: { templateId?: number; coverLetterId?: number }) =>
  request<CoverLetterResult>(`/users/${uid}/offers/${offerId}/cover-letter`, {
    method: "POST",
    body: JSON.stringify({ template_id: opts?.templateId ?? null, cover_letter_id: opts?.coverLetterId ?? null }),
  });

export const getStoredCoverLetters = (uid: number) =>
  request<StoredCoverLetter[]>(`/users/${uid}/cover-letters`);

export const deleteStoredCoverLetter = (uid: number, id: number) =>
  request<void>(`/users/${uid}/cover-letters/${id}`, { method: "DELETE" });

export interface ChatEditCoverLetterResponse {
  updated_content: string;
}

export const chatEditCoverLetter = (
  uid: number,
  letterId: number,
  content: string,
  message: string,
  conversationHistory?: { role: string; content: string }[],
) =>
  request<ChatEditCoverLetterResponse>(`/users/${uid}/cover-letters/${letterId}/chat-edit`, {
    method: "POST",
    body: JSON.stringify({ content, message, conversation_history: conversationHistory ?? null }),
  });

export const updateCoverLetter = (uid: number, letterId: number, data: { content?: string; saved?: boolean }) =>
  request<StoredCoverLetter>(`/users/${uid}/cover-letters/${letterId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const getSavedCoverLetters = (uid: number) =>
  request<StoredCoverLetter[]>(`/users/${uid}/cover-letters?saved_only=true`);

export const createCoverLetter = (uid: number, data: { name: string; content: string }) =>
  request<StoredCoverLetter>(`/users/${uid}/cover-letters`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const uploadCoverLetterPdf = async (uid: number, file: File): Promise<StoredCoverLetter> => {
  const form = new FormData();
  form.append("file", file);
  const res = await fetchWithAuth(`${BASE}/users/${uid}/cover-letters/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.json();
};

export const getStoredSkillGaps = (uid: number) =>
  request<StoredSkillGap[]>(`/users/${uid}/skill-gaps`);

export const deleteStoredSkillGap = (uid: number, id: number) =>
  request<void>(`/users/${uid}/skill-gaps/${id}`, { method: "DELETE" });

export const adaptCVLatex = (uid: number, offerId: number, cvId: number) =>
  request<AdaptCVLatexResult>(`/users/${uid}/offers/${offerId}/adapt-cv-latex`, {
    method: "POST",
    body: JSON.stringify({ cv_id: cvId }),
  });

export const suggestCVChanges = (uid: number, offerId: number, cvId: number) =>
  request<CVSuggestionsResult>(`/users/${uid}/offers/${offerId}/suggest-cv-changes`, {
    method: "POST",
    body: JSON.stringify({ cv_id: cvId }),
  });

export const saveCVWithLatex = (uid: number, data: {
  name?: string; content: string; latex_content: string;
  support_files_dir?: string | null;
  company?: string; job_title?: string; offer_id?: number;
}) =>
  request<CV>(`/users/${uid}/cvs`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const compileCVPdf = async (uid: number, cvId: number): Promise<Blob> => {
  const res = await fetchWithAuth(`${BASE}/users/${uid}/cvs/${cvId}/compile-pdf`, {
    method: "POST",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.blob();
};

export const parseOffer = ({ text, url }: { text?: string; url?: string }) =>
  request<ParsedOffer>("/parse-offer", {
    method: "POST",
    body: JSON.stringify({ text, url }),
  });

export interface CompanyInfo {
  description: string | null;
  extract: string | null;
  logo_url: string | null;
  page_url: string | null;
}

export const getCompanyInfo = (name: string) =>
  request<CompanyInfo>(`/company-info?name=${encodeURIComponent(name)}`);

export const autoFillProfile = (uid: number, cvId?: number) =>
  request<AutoFillResult>(`/users/${uid}/auto-fill-profile${cvId != null ? `?cv_id=${cvId}` : ""}`, {
    method: "POST",
  });

// ---------- Pitch Analysis ----------

export interface PitchAnalysisResult {
  id: number;
  offer_title: string | null;
  company: string | null;
  transcription: string;
  structure_clarity: string;
  strengths: string[];
  improvements: string[];
  offer_relevance: string | null;
  overall_score: number;
  summary: string;
}

export interface StoredPitchAnalysis {
  id: number;
  offer_id: number | null;
  offer_title: string | null;
  company: string | null;
  transcription: string;
  structure_clarity: string;
  strengths: string[];
  improvements: string[];
  offer_relevance: string | null;
  overall_score: number;
  summary: string;
  created_at: string | null;
}

export const analyzePitchGeneral = async (uid: number, file: File): Promise<PitchAnalysisResult> => {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetchWithAuth(`${BASE}/users/${uid}/pitch-analysis`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.json();
};

export const analyzePitchForOffer = async (uid: number, offerId: number, file: File): Promise<PitchAnalysisResult> => {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetchWithAuth(`${BASE}/users/${uid}/offers/${offerId}/pitch-analysis`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.json();
};

export const getStoredPitchAnalyses = (uid: number) =>
  request<StoredPitchAnalysis[]>(`/users/${uid}/pitch-analyses`);

export const deleteStoredPitchAnalysis = (uid: number, id: number) =>
  request<void>(`/users/${uid}/pitch-analyses/${id}`, { method: "DELETE" });

// ---------- Audio Transcription (Voxtral) ----------

export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  const fd = new FormData();
  fd.append("file", audioBlob, "recording.webm");
  const res = await fetchWithAuth(`${BASE}/transcribe-audio`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.transcription;
};

// ---------- Interview Simulation ----------

export interface InterviewSession {
  id: number;
  session_id: string;
  offer_id: number | null;
  interview_type: string;
  difficulty: string;
  language: string;
  duration_minutes: number;
  enable_hints: boolean;
  status: string;
  offer_title: string | null;
  company: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string | null;
}

export interface InterviewTurn {
  id: number;
  turn_number: number;
  question_text: string;
  question_category: string | null;
  answer_transcript: string | null;
  answer_duration_seconds: number | null;
  skipped: boolean;
  clarity_score: number | null;
  relevance_score: number | null;
  structure_score: number | null;
  feedback: string | null;
  better_answer: string | null;
}

export interface InterviewAnalysis {
  id: number;
  overall_score: number;
  communication_score: number;
  technical_score: number | null;
  behavioral_score: number | null;
  confidence_score: number;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  summary: string;
  filler_words_analysis: string | null;
  star_method_usage: string | null;
  full_transcript: string | null;
  per_turn_feedback: InterviewTurn[];
  created_at: string | null;
}

export interface InterviewSessionDetail extends InterviewSession {
  turns: InterviewTurn[];
  analysis: InterviewAnalysis | null;
}

export interface PredictedQuestion {
  question: string;
  category: string;
  difficulty: string;
  tip: string;
}

export interface InterviewProgress {
  total_sessions: number;
  average_score: number | null;
  score_trend: number[];
  best_category: string | null;
  worst_category: string | null;
  total_practice_minutes: number;
  sessions_this_week: number;
}

export const createInterviewSession = (uid: number, data: {
  offer_id?: number | null;
  interview_type: string;
  difficulty: string;
  language: string;
  duration_minutes: number;
  enable_hints?: boolean;
}) =>
  request<InterviewSession>(`/users/${uid}/interview-sessions`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getInterviewSessions = (uid: number, limit = 100, offset = 0) =>
  request<PaginatedResponse<InterviewSession>>(`/users/${uid}/interview-sessions?limit=${limit}&offset=${offset}`);

export const getInterviewSessionDetail = (uid: number, sessionId: number) =>
  request<InterviewSessionDetail>(`/users/${uid}/interview-sessions/${sessionId}`);

export const deleteInterviewSession = (uid: number, sessionId: number) =>
  request<void>(`/users/${uid}/interview-sessions/${sessionId}`, { method: "DELETE" });

export const analyzeInterview = (uid: number, sessionId: number) =>
  request<InterviewAnalysis>(`/users/${uid}/interview-sessions/${sessionId}/analyze`, {
    method: "POST",
  });

export const getInterviewAnalysis = (uid: number, sessionId: number) =>
  request<InterviewAnalysis>(`/users/${uid}/interview-sessions/${sessionId}/analysis`);

export const predictQuestions = (uid: number, offerId: number, data: {
  interview_type: string;
  difficulty: string;
  language: string;
  count?: number;
}) =>
  request<PredictedQuestion[]>(`/users/${uid}/offers/${offerId}/predict-questions`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getInterviewProgress = (uid: number) =>
  request<InterviewProgress>(`/users/${uid}/interview-progress`);

// ---------- Auto-fill Profile (upload) ----------

// ---------- Offer Search / Scraping ----------

export interface ScrapedOffer {
  id: number;
  source: string;
  source_id: string;
  company: string;
  title: string;
  description: string | null;
  locations: string | null;
  link: string | null;
  contract_type: string | null;
  salary: string | null;
  published_at: string | null;
  match_score: number | null;
  match_reasons: string[];
  saved: boolean;
  created_at: string | null;
}

export interface OfferSearchResponse {
  results: ScrapedOffer[];
  total: number;
  sources_used: string[];
  parsed_query?: Record<string, unknown> | null;
}

export const searchOffers = (uid: number, data: {
  keywords: string;
  location?: string;
  country?: string;
  radius_km?: number;
  sources?: string[];
  max_results?: number;
}) =>
  request<OfferSearchResponse>(`/users/${uid}/search-offers`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getScrapedOffers = (uid: number, limit = 100, offset = 0) =>
  request<PaginatedResponse<ScrapedOffer>>(`/users/${uid}/scraped-offers?limit=${limit}&offset=${offset}`);

export const saveScrapedOffer = (uid: number, offerId: number) =>
  request<{ detail: string; offer_id: number }>(`/users/${uid}/scraped-offers/${offerId}/save`, {
    method: "POST",
  });

export const deleteScrapedOffer = (uid: number, offerId: number) =>
  request<void>(`/users/${uid}/scraped-offers/${offerId}`, { method: "DELETE" });

export const clearScrapedOffers = (uid: number) =>
  request<void>(`/users/${uid}/scraped-offers`, { method: "DELETE" });

export const chatSearchOffers = (uid: number, message: string, maxResults?: number) =>
  request<OfferSearchResponse>(`/users/${uid}/chat-search`, {
    method: "POST",
    body: JSON.stringify({ message, max_results: maxResults ?? 20 }),
  });

// ---------- Reminders ----------

export interface Reminder {
  id: number;
  offer_id: number | null;
  reminder_type: string;
  title: string;
  description: string | null;
  due_at: string;
  is_done: boolean;
  created_at: string | null;
}

export const getReminders = (uid: number, includeDone?: boolean, limit = 100, offset = 0) =>
  request<PaginatedResponse<Reminder>>(`/users/${uid}/reminders?include_done=${includeDone ?? false}&limit=${limit}&offset=${offset}`);

export const createReminder = (uid: number, data: {
  offer_id?: number | null; reminder_type?: string;
  title: string; description?: string; due_at: string;
}) =>
  request<Reminder>(`/users/${uid}/reminders`, { method: "POST", body: JSON.stringify(data) });

export const updateReminder = (uid: number, id: number, data: {
  title?: string; description?: string; due_at?: string;
  reminder_type?: string; is_done?: boolean;
}) =>
  request<Reminder>(`/users/${uid}/reminders/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteReminder = (uid: number, id: number) =>
  request<void>(`/users/${uid}/reminders/${id}`, { method: "DELETE" });

// ---------- Offer Notes ----------

export interface OfferNote {
  id: number;
  offer_id: number;
  content: string;
  created_at: string | null;
  updated_at: string | null;
}

export const getOfferNotes = (uid: number, offerId: number, limit = 100, offset = 0) =>
  request<PaginatedResponse<OfferNote>>(`/users/${uid}/offers/${offerId}/notes?limit=${limit}&offset=${offset}`);

export const createOfferNote = (uid: number, offerId: number, content: string) =>
  request<OfferNote>(`/users/${uid}/offers/${offerId}/notes`, {
    method: "POST", body: JSON.stringify({ content }),
  });

export const updateOfferNote = (uid: number, offerId: number, noteId: number, content: string) =>
  request<OfferNote>(`/users/${uid}/offers/${offerId}/notes/${noteId}`, {
    method: "PATCH", body: JSON.stringify({ content }),
  });

export const deleteOfferNote = (uid: number, offerId: number, noteId: number) =>
  request<void>(`/users/${uid}/offers/${offerId}/notes/${noteId}`, { method: "DELETE" });

// ---------- Dashboard ----------

export interface DashboardStats {
  offers_by_status: Record<string, number>;
  total_offers: number;
  average_interview_score: number | null;
  upcoming_reminders: Reminder[];
  recent_activity: Array<Record<string, unknown>>;
  interview_sessions_count: number;
  interview_sessions_this_week: number;
}

export const getDashboard = (uid: number) =>
  request<DashboardStats>(`/users/${uid}/dashboard`);

// ---------- Calendar ----------

export interface CalendarEvent {
  id: string;
  event_type: string;
  title: string;
  date: string;
  offer_id: number | null;
  company: string | null;
  metadata: Record<string, unknown> | null;
}

export interface CalendarResponse {
  events: CalendarEvent[];
}

export const getCalendarEvents = (uid: number, start: string, end: string) =>
  request<CalendarResponse>(`/users/${uid}/calendar?start=${start}&end=${end}`);

// ---------- Auto-fill Profile (upload) ----------

export const autoFillProfileFromUpload = async (uid: number, file: File): Promise<AutoFillResult> => {
  const form = new FormData();
  form.append("file", file);
  const res = await fetchWithAuth(`${BASE}/users/${uid}/auto-fill-profile/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.json();
};

// ---------- Memos ----------

export interface Memo {
  id: number;
  title: string;
  content: string;
  tags: string[];
  offer_id: number | null;
  skill_name: string | null;
  is_favorite: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export const getMemos = (uid: number, params?: { search?: string; tag?: string; offer_id?: number; favorites_only?: boolean; limit?: number; offset?: number }) => {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.tag) qs.set("tag", params.tag);
  if (params?.offer_id) qs.set("offer_id", String(params.offer_id));
  if (params?.favorites_only) qs.set("favorites_only", "true");
  qs.set("limit", String(params?.limit ?? 100));
  qs.set("offset", String(params?.offset ?? 0));
  return request<PaginatedResponse<Memo>>(`/users/${uid}/memos?${qs}`);
};

export const getMemo = (uid: number, memoId: number) =>
  request<Memo>(`/users/${uid}/memos/${memoId}`);

export const createMemo = (uid: number, data: { title: string; content: string; tags?: string[]; offer_id?: number; skill_name?: string }) =>
  request<Memo>(`/users/${uid}/memos`, { method: "POST", body: JSON.stringify(data) });

export const updateMemo = (uid: number, memoId: number, data: Partial<{ title: string; content: string; tags: string[]; offer_id: number | null; skill_name: string | null; is_favorite: boolean }>) =>
  request<Memo>(`/users/${uid}/memos/${memoId}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteMemo = (uid: number, memoId: number) =>
  request<{ detail: string }>(`/users/${uid}/memos/${memoId}`, { method: "DELETE" });

// ---------- Skill Recommendations ----------

export interface AggregatedSkill {
  skill_name: string;
  frequency: number;
  skill_type: string;
  offer_titles: string[];
  user_has_skill: boolean;
}

export interface SkillRecommendations {
  aggregated_skills: AggregatedSkill[];
  offers_analyzed_count: number;
  generated_at: string | null;
}

export const getSkillRecommendations = (uid: number) =>
  request<SkillRecommendations>(`/users/${uid}/skill-recommendations`);

export const refreshSkillRecommendations = (uid: number) =>
  request<SkillRecommendations>(`/users/${uid}/skill-recommendations/refresh`, { method: "POST" });

// ---------- Goals ----------

export interface Goal {
  id: number;
  title: string;
  frequency: string;
  target_count: number;
  is_active: boolean;
  created_at: string | null;
}

export interface GoalProgress {
  id: number;
  goal_id: number;
  date: string;
  completed_count: number;
  notes: string | null;
}

export interface GoalWithProgress extends Goal {
  today_completed: number;
  today_daily_completed: number;
  current_streak: number;
}

export interface DailyGoalsSummary {
  goals: GoalWithProgress[];
  total_goals: number;
  completed_today: number;
  longest_streak: number;
}

export const getGoals = (uid: number, activeOnly = true, limit = 100, offset = 0) =>
  request<PaginatedResponse<Goal>>(`/users/${uid}/goals?active_only=${activeOnly}&limit=${limit}&offset=${offset}`);

export const getGoalsSummary = (uid: number) =>
  request<DailyGoalsSummary>(`/users/${uid}/goals/summary`);

export const createGoal = (uid: number, data: { title: string; frequency?: string; target_count?: number }) =>
  request<Goal>(`/users/${uid}/goals`, { method: "POST", body: JSON.stringify(data) });

export const updateGoal = (uid: number, goalId: number, data: Partial<{ title: string; frequency: string; target_count: number; is_active: boolean }>) =>
  request<Goal>(`/users/${uid}/goals/${goalId}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteGoal = (uid: number, goalId: number) =>
  request<{ detail: string }>(`/users/${uid}/goals/${goalId}`, { method: "DELETE" });

export const logGoalProgress = (uid: number, goalId: number, data: { completed_count: number; notes?: string }) =>
  request<GoalProgress>(`/users/${uid}/goals/${goalId}/progress`, { method: "POST", body: JSON.stringify(data) });

export const getGoalProgress = (uid: number, goalId: number, startDate?: string, endDate?: string) => {
  const qs = new URLSearchParams();
  if (startDate) qs.set("start_date", startDate);
  if (endDate) qs.set("end_date", endDate);
  const q = qs.toString();
  return request<GoalProgress[]>(`/users/${uid}/goals/${goalId}/progress${q ? `?${q}` : ""}`);
};
