import express from 'express';
import Session from '../models/Session';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { calculateOverallScore } from '../analysis-engine/scoring.service';
import { EvaluationScores, BehavioralMetrics, SpeechMetrics } from '../analysis-engine/types';

const router = express.Router();

function avgValues(obj?: Record<string, number>): number {
  if (!obj) return 0;
  const vals = Object.values(obj).filter((v) => typeof v === 'number');
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function deriveSpeakingScoreFromSpeech(speech?: SpeechMetrics): number | null {
  if (!speech) return null;
  const parts: number[] = [];

  if (typeof speech.latency === 'number' && speech.latency !== null) {
    if (speech.latency <= 2.5) parts.push(8.5);
    else if (speech.latency <= 4) parts.push(7);
    else parts.push(5.5);
  }

  if (typeof speech.speechRate === 'number' && speech.speechRate !== null) {
    if (speech.speechRate >= 120 && speech.speechRate <= 160) parts.push(8.5);
    else if (speech.speechRate >= 100 && speech.speechRate <= 175) parts.push(7);
    else parts.push(5.5);
  }

  if (speech.confidenceSignal === 'high') parts.push(8.5);
  else if (speech.confidenceSignal === 'medium') parts.push(7);
  else if (speech.confidenceSignal === 'low') parts.push(5);

  return parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : null;
}

// GET /api/history - List all interviews of authenticated user
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const sessions = await Session.find({ userId }).sort({ createdAt: -1 });

    const interviewList = sessions.map((session) => {
      const evaluations = session.evaluations || [];
      const hasEvaluations = evaluations.length > 0;
      const report = hasEvaluations ? calculateOverallScore(evaluations) : null;

      return {
        sessionId: session.sessionId,
        domain: session.domain,
        experienceLevel: session.experienceLevel,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        phase: session.phase,
        questionCount: evaluations.length,
        completedPhases: Array.from(new Set(evaluations.map((e) => e.phase))),
        overallScore: report ? report.overall_score : null,
        hasEvaluations,
        hasResume: Boolean(session.resumeId),
      };
    });

    const evaluatedSessions = interviewList.filter((item) => item.overallScore !== null && item.overallScore > 0);
    const totalInterviews = interviewList.length;
    const scores = evaluatedSessions.map((s) => s.overallScore as number);
    const averageScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const bestScore = scores.length ? Math.max(...scores) : null;
    const latestRole = interviewList[0]?.domain || null;

    return res.json({
      interviews: interviewList,
      summary: {
        totalInterviews,
        completedInterviews: evaluatedSessions.length,
        averageScore,
        bestScore,
        latestRole,
      },
    });
  } catch (error) {
    console.error('Fetch interview history error:', error);
    return res.status(500).json({ error: 'Failed to retrieve interview history' });
  }
});

// GET /api/history/comparison?sessionId=... - Longitudinal comparison vs previous interview
router.get('/comparison', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?._id;
    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'sessionId query parameter is required' });
    }

    // Ensure session belongs to this user
    const currentSession = await Session.findOne({ sessionId, userId });
    if (!currentSession) {
      return res.status(404).json({ error: 'Session not found or not owned by user' });
    }

    const currentEvaluations = currentSession.evaluations || [];
    const currentReport = calculateOverallScore(currentEvaluations);

    // Find previous session for this user with evaluations, created strictly before the current session
    const previousSession = await Session.findOne({
      userId,
      _id: { $ne: currentSession._id },
      createdAt: { $lt: currentSession.createdAt },
      'evaluations.0': { $exists: true },
    }).sort({ createdAt: -1 });

    if (!previousSession || !previousSession.evaluations || previousSession.evaluations.length === 0) {
      return res.json({
        hasPrevious: false,
        message: 'This is your first interview. Complete another interview to see your progress.',
        current: {
          sessionId: currentSession.sessionId,
          domain: currentSession.domain,
          experienceLevel: currentSession.experienceLevel,
          createdAt: currentSession.createdAt,
          overall_score: currentReport.overall_score,
          metrics: currentReport.metrics,
          behavioral: currentReport.behavioral,
          speech: currentReport.speech,
        },
      });
    }

    const prevEvaluations = previousSession.evaluations || [];
    const prevReport = calculateOverallScore(prevEvaluations);

    const currentTechAvg = avgValues(currentReport.metrics as unknown as Record<string, number>);
    const prevTechAvg = avgValues(prevReport.metrics as unknown as Record<string, number>);

    const currentBehAvg = avgValues(currentReport.behavioral as unknown as Record<string, number>);
    const prevBehAvg = avgValues(prevReport.behavioral as unknown as Record<string, number>);

    const currentSpeechScore = deriveSpeakingScoreFromSpeech(currentReport.speech);
    const prevSpeechScore = deriveSpeakingScoreFromSpeech(prevReport.speech);

    const deltaSpeech =
      currentSpeechScore !== null && prevSpeechScore !== null
        ? Number((currentSpeechScore - prevSpeechScore).toFixed(1))
        : null;

    return res.json({
      hasPrevious: true,
      current: {
        sessionId: currentSession.sessionId,
        domain: currentSession.domain,
        experienceLevel: currentSession.experienceLevel,
        createdAt: currentSession.createdAt,
        overall_score: currentReport.overall_score,
        metrics: currentReport.metrics,
        behavioral: currentReport.behavioral,
        speech: currentReport.speech,
      },
      previous: {
        sessionId: previousSession.sessionId,
        domain: previousSession.domain,
        experienceLevel: previousSession.experienceLevel,
        createdAt: previousSession.createdAt,
        overall_score: prevReport.overall_score,
        metrics: prevReport.metrics,
        behavioral: prevReport.behavioral,
        speech: prevReport.speech,
      },
      delta: {
        overall_score: currentReport.overall_score - prevReport.overall_score,
        technical: Number((currentTechAvg - prevTechAvg).toFixed(1)),
        behavioral: Number((currentBehAvg - prevBehAvg).toFixed(1)),
        speech: deltaSpeech,
      },
    });
  } catch (error) {
    console.error('Fetch interview comparison error:', error);
    return res.status(500).json({ error: 'Failed to generate interview comparison' });
  }
});

export default router;
