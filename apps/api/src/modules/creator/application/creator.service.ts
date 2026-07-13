import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { NewsService } from '../../news/application/news.service';
import {
  DEFAULT_PERMISSIONS,
  PREDICTION_DISCLAIMER,
  buildDna,
  buildRecommendations,
  coachTips,
  enrichSearch,
  generateIdeaPack,
  type CreatorDnaRecord,
  type CreatorProfileRecord,
} from '../domain/creator-intelligence';
import type { CreatorPermissionsMap } from '@nexiora/shared';

@Injectable()
export class CreatorService {
  private readonly logger = new Logger(CreatorService.name);
  private readonly memory = new Map<string, CreatorProfileRecord>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly news: NewsService,
  ) {}

  async getOrCreateProfile(userId: string, emailHint?: string | null): Promise<CreatorProfileRecord> {
    const existing = await this.readProfile(userId);
    if (existing) return existing;

    const now = new Date().toISOString();
    const created: CreatorProfileRecord = {
      userId,
      displayName: emailHint?.split('@')[0] ?? null,
      niche: null,
      language: 'en',
      country: null,
      speakingStyle: null,
      preferredLengthMinutes: 12,
      permissions: { ...DEFAULT_PERMISSIONS },
      onboardingCompletedAt: null,
      youtubeChannelId: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.writeProfile(created);
    return created;
  }

  async upsertProfile(
    userId: string,
    patch: Partial<{
      displayName: string;
      niche: string;
      language: string;
      country: string;
      speakingStyle: string;
      preferredLengthMinutes: number;
    }>,
  ): Promise<CreatorProfileRecord> {
    const current = await this.getOrCreateProfile(userId);
    const next: CreatorProfileRecord = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await this.writeProfile(next);
    return next;
  }

  async patchPermissions(
    userId: string,
    permissions: Partial<CreatorPermissionsMap>,
  ): Promise<CreatorProfileRecord> {
    const current = await this.getOrCreateProfile(userId);
    const next: CreatorProfileRecord = {
      ...current,
      permissions: { ...current.permissions, ...permissions },
      onboardingCompletedAt:
        current.onboardingCompletedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.writeProfile(next);
    return next;
  }

  async getDna(userId: string): Promise<{ dna: CreatorDnaRecord; disclaimer: string }> {
    const profile = await this.getOrCreateProfile(userId);
    const signals = await this.loadSignals();
    return {
      dna: buildDna(profile, signals),
      disclaimer:
        profile.permissions.youtube_channel
          ? 'Channel-linked details update when you refresh your connected account.'
          : 'Estimated profile for now. Connect YouTube to replace placeholders with your real channel stats.',
    };
  }

  async getDashboard(userId: string, greetingName?: string | null) {
    const profile = await this.getOrCreateProfile(userId);
    const signals = await this.loadSignals();
    const recommendations = buildRecommendations({ profile, signals, limit: 6 });
    const hour = new Date().getHours();
    const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const name = profile.displayName || greetingName || 'creator';

    return {
      greeting: `${hello}, ${name}.`,
      subtitle:
        'Personal topic ideas from public headlines and your creator profile. Suggestions are estimates — always review before you publish.',
      needsOnboarding: !profile.niche || !profile.onboardingCompletedAt,
      profile,
      todaysBest: recommendations,
      breakingTrends: signals.slice(0, 8).map((s) => ({
        title: s.title,
        url: s.url,
        source: s.source,
        category: s.category,
        kind: 'signal' as const,
        why: `Live public headline from ${s.source}.`,
      })),
      upcomingTrends: recommendations
        .filter((r) => r.scores.growthSpeed >= 60)
        .slice(0, 4),
      highCpm: [...recommendations].sort((a, b) => b.scores.cpmScore - a.scores.cpmScore).slice(0, 4),
      lowCompetition: [...recommendations]
        .sort((a, b) => a.scores.competition - b.scores.competition)
        .slice(0, 4),
      highSearchVolume: [...recommendations]
        .sort((a, b) => b.scores.searchDemand - a.scores.searchDemand)
        .slice(0, 4),
      coach: coachTips(profile, recommendations).slice(0, 3),
      disclaimer: PREDICTION_DISCLAIMER,
    };
  }

  async listOpportunities(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const signals = await this.loadSignals();
    return {
      items: buildRecommendations({ profile, signals, limit: 12 }),
      disclaimer: PREDICTION_DISCLAIMER,
    };
  }

  async listTrends(userId: string) {
    await this.getOrCreateProfile(userId);
    const signals = await this.loadSignals();
    return {
      items: signals.map((s) => {
        const hoursAgo = Math.max(0, (Date.now() - +new Date(s.publishedAt)) / 3_600_000);
        const trendScore = Math.max(20, Math.min(99, Math.round(92 - hoursAgo * 2.5)));
        return {
          topic: s.title,
          trendScore,
          source: s.source,
          url: s.url,
          category: s.category,
          kind: 'signal' as const,
          why: `Fresh public item from ${s.source} (${s.category}).`,
          publishedAt: s.publishedAt,
        };
      }),
      disclaimer: 'Trend board uses live public headlines. Google Trends and YouTube Trending unlock when those connections are enabled.',
    };
  }

  async generateIdeas(userId: string, topic: string, _format?: string) {
    const profile = await this.getOrCreateProfile(userId);
    return generateIdeaPack(topic, profile.niche);
  }

  async enrich(userId: string, query: string) {
    const profile = await this.getOrCreateProfile(userId);
    const signals = await this.loadSignals();
    return enrichSearch(query, profile.niche, signals);
  }

  async getCoach(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const signals = await this.loadSignals();
    const recs = buildRecommendations({ profile, signals, limit: 5 });
    return {
      tips: coachTips(profile, recs),
      disclaimer: PREDICTION_DISCLAIMER,
    };
  }

  private async loadSignals() {
    try {
      const { items } = await this.news.list({ limit: 24 });
      return items.map((item) => ({
        title: item.title,
        url: item.url,
        source: item.source,
        category: item.category,
        publishedAt: item.publishedAt,
      }));
    } catch (error) {
      this.logger.warn(`Signal load failed: ${(error as Error).message}`);
      return [];
    }
  }

  private async readProfile(userId: string): Promise<CreatorProfileRecord | null> {
    if (this.memory.has(userId)) return this.memory.get(userId)!;

    if (await this.prisma.isHealthy()) {
      try {
        const client = this.prisma as unknown as {
          creatorProfile?: {
            findUnique: (args: { where: { userId: string } }) => Promise<Record<string, unknown> | null>;
          };
        };
        const row = await client.creatorProfile?.findUnique({ where: { userId } });
        if (!row) return null;
        const mapped = this.fromPrisma(row as Parameters<CreatorService['fromPrisma']>[0]);
        this.memory.set(userId, mapped);
        return mapped;
      } catch (error) {
        this.logger.warn(`Creator profile read failed: ${(error as Error).message}`);
      }
    }
    return null;
  }

  private async writeProfile(profile: CreatorProfileRecord): Promise<void> {
    this.memory.set(profile.userId, profile);

    if (!(await this.prisma.isHealthy())) return;
    try {
      const client = this.prisma as unknown as {
        creatorProfile?: {
          upsert: (args: {
            where: { userId: string };
            create: Record<string, unknown>;
            update: Record<string, unknown>;
          }) => Promise<unknown>;
        };
      };
      await client.creatorProfile?.upsert({
        where: { userId: profile.userId },
        create: {
          userId: profile.userId,
          displayName: profile.displayName,
          niche: profile.niche,
          language: profile.language,
          country: profile.country,
          speakingStyle: profile.speakingStyle,
          preferredLengthMinutes: profile.preferredLengthMinutes,
          permissions: profile.permissions,
          onboardingCompletedAt: profile.onboardingCompletedAt
            ? new Date(profile.onboardingCompletedAt)
            : null,
          youtubeChannelId: profile.youtubeChannelId,
        },
        update: {
          displayName: profile.displayName,
          niche: profile.niche,
          language: profile.language,
          country: profile.country,
          speakingStyle: profile.speakingStyle,
          preferredLengthMinutes: profile.preferredLengthMinutes,
          permissions: profile.permissions,
          onboardingCompletedAt: profile.onboardingCompletedAt
            ? new Date(profile.onboardingCompletedAt)
            : null,
          youtubeChannelId: profile.youtubeChannelId,
        },
      });
    } catch (error) {
      this.logger.warn(`Creator profile write failed: ${(error as Error).message}`);
    }
  }

  private fromPrisma(row: {
    userId: string;
    displayName: string | null;
    niche: string | null;
    language: string;
    country: string | null;
    speakingStyle: string | null;
    preferredLengthMinutes: number | null;
    permissions: unknown;
    onboardingCompletedAt: Date | null;
    youtubeChannelId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): CreatorProfileRecord {
    const permissions = {
      ...DEFAULT_PERMISSIONS,
      ...((row.permissions as Partial<CreatorPermissionsMap>) ?? {}),
    };
    return {
      userId: row.userId,
      displayName: row.displayName,
      niche: row.niche,
      language: row.language,
      country: row.country,
      speakingStyle: row.speakingStyle,
      preferredLengthMinutes: row.preferredLengthMinutes,
      permissions,
      onboardingCompletedAt: row.onboardingCompletedAt?.toISOString() ?? null,
      youtubeChannelId: row.youtubeChannelId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
