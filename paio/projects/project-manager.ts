import crypto from 'crypto';
import { AISystemBus } from '../events/ai-system-bus';

export type ProjectStatus = 'active' | 'paused' | 'archived' | 'completed';

export interface ProjectActivity {
  id: string;
  projectId: string;
  type: 'file_edit' | 'task_update' | 'agent_run' | 'commit' | 'decision' | 'note';
  description: string;
  actor: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface PAIOSProject {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: ProjectStatus;
  userId: string;
  rootDirectory?: string;
  gitRepository?: string;
  currentGoal?: string;
  activeAgentIds: string[];
  tags: string[];
  pinnedFiles: string[];
  metadata: Record<string, unknown>;
  lastActiveAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectContinuityBriefing {
  project: PAIOSProject;
  recentActivities: ProjectActivity[];
  pendingSummary: string;
  recommendedNextAction: string;
}

export class ProjectManager {
  private static instance: ProjectManager;
  private projects: Map<string, PAIOSProject> = new Map();
  private activities: Map<string, ProjectActivity[]> = new Map();
  private activeProjectId: string | null = null;
  private bus = AISystemBus.getInstance();

  private constructor() {
    this.seedDefaultProject();
  }

  public static getInstance(): ProjectManager {
    if (!ProjectManager.instance) {
      ProjectManager.instance = new ProjectManager();
    }
    return ProjectManager.instance;
  }

  private seedDefaultProject(): void {
    const defaultProject: PAIOSProject = {
      id: 'proj_hikmah_core',
      name: 'Hikmah AI Operating System',
      slug: 'hikmah-core',
      description: 'The master AI Operating System codebase and capability suite.',
      status: 'active',
      userId: 'user_master_owner',
      rootDirectory: 'c:/Users/tarik/Downloads/my assistant ai',
      gitRepository: 'https://github.com/tarikk786786/Hikmah.git',
      currentGoal: 'Deliver Step 25 PAIOS top-level operating environment.',
      activeAgentIds: ['orchestrator-supervisor', 'system-kernel'],
      tags: ['ai-os', 'hikmah', 'paios'],
      pinnedFiles: ['package.json', 'implementation_plan.md'],
      metadata: { priority: 'high' },
      lastActiveAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.projects.set(defaultProject.id, defaultProject);
    this.activeProjectId = defaultProject.id;
  }

  public createProject(params: {
    name: string;
    slug?: string;
    description?: string;
    userId: string;
    rootDirectory?: string;
    gitRepository?: string;
    currentGoal?: string;
    tags?: string[];
  }): PAIOSProject {
    const id = `proj_${crypto.randomBytes(6).toString('hex')}`;
    const slug = params.slug || params.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const now = new Date().toISOString();

    const project: PAIOSProject = {
      id,
      name: params.name,
      slug,
      description: params.description || '',
      status: 'active',
      userId: params.userId,
      rootDirectory: params.rootDirectory,
      gitRepository: params.gitRepository,
      currentGoal: params.currentGoal || 'Initiate project objectives.',
      activeAgentIds: [],
      tags: params.tags || [],
      pinnedFiles: [],
      metadata: {},
      lastActiveAt: now,
      createdAt: now,
      updatedAt: now,
    };

    this.projects.set(id, project);
    this.bus.emit({
      type: 'project.created',
      source: 'ProjectManager',
      userId: params.userId,
      projectId: id,
      data: { name: project.name, slug: project.slug },
    });

    return project;
  }

  public getProject(idOrSlug: string): PAIOSProject | undefined {
    if (this.projects.has(idOrSlug)) {
      return this.projects.get(idOrSlug);
    }
    return Array.from(this.projects.values()).find(p => p.slug === idOrSlug);
  }

  public getActiveProject(): PAIOSProject | undefined {
    if (this.activeProjectId && this.projects.has(this.activeProjectId)) {
      return this.projects.get(this.activeProjectId);
    }
    const first = Array.from(this.projects.values())[0];
    if (first) {
      this.activeProjectId = first.id;
      return first;
    }
    return undefined;
  }

  public setActiveProject(idOrSlug: string): PAIOSProject {
    const proj = this.getProject(idOrSlug);
    if (!proj) {
      throw new Error(`Project not found: ${idOrSlug}`);
    }
    this.activeProjectId = proj.id;
    proj.lastActiveAt = new Date().toISOString();
    proj.updatedAt = proj.lastActiveAt;

    this.bus.emit({
      type: 'project.activated',
      source: 'ProjectManager',
      userId: proj.userId,
      projectId: proj.id,
      data: { name: proj.name, slug: proj.slug },
    });

    return proj;
  }

  public listProjects(userId?: string): PAIOSProject[] {
    const list = Array.from(this.projects.values());
    return userId ? list.filter(p => p.userId === userId) : list;
  }

  public updateProject(id: string, updates: Partial<PAIOSProject>): PAIOSProject {
    const proj = this.projects.get(id);
    if (!proj) {
      throw new Error(`Project ${id} does not exist.`);
    }
    Object.assign(proj, updates, { updatedAt: new Date().toISOString() });
    this.bus.emit({
      type: 'project.updated',
      source: 'ProjectManager',
      userId: proj.userId,
      projectId: proj.id,
      data: { updates },
    });
    return proj;
  }

  public recordActivity(projectId: string, activity: Omit<ProjectActivity, 'id' | 'projectId' | 'timestamp'>): ProjectActivity {
    const fullActivity: ProjectActivity = {
      ...activity,
      id: `act_${crypto.randomBytes(6).toString('hex')}`,
      projectId,
      timestamp: new Date().toISOString(),
    };

    if (!this.activities.has(projectId)) {
      this.activities.set(projectId, []);
    }
    const list = this.activities.get(projectId)!;
    list.unshift(fullActivity);
    if (list.length > 500) list.pop();

    const proj = this.projects.get(projectId);
    if (proj) {
      proj.lastActiveAt = fullActivity.timestamp;
    }

    this.bus.emit({
      type: 'project.activity_recorded',
      source: 'ProjectManager',
      projectId,
      data: { type: fullActivity.type, description: fullActivity.description },
    });

    return fullActivity;
  }

  public getContinuityBriefing(idOrSlug: string): ProjectContinuityBriefing {
    const proj = this.getProject(idOrSlug);
    if (!proj) {
      throw new Error(`Project ${idOrSlug} not found.`);
    }
    const recent = (this.activities.get(proj.id) || []).slice(0, 10);
    const pendingSummary = proj.currentGoal
      ? `Active target: ${proj.currentGoal}`
      : 'No explicit active goal set.';
    const recommendedNextAction = recent.length > 0
      ? `Resume from recent activity: "${recent[0].description}"`
      : `Advance current goal: "${proj.currentGoal || 'Plan initial milestone'}"`;

    return {
      project: proj,
      recentActivities: recent,
      pendingSummary,
      recommendedNextAction,
    };
  }
}
