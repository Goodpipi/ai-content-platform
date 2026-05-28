export interface LibraryItem {
  id: number;
  cat: string;
  title: string;
  meta: string;
  cms: boolean;
  def: boolean;
}

export interface TopicItem {
  title: string;
  reason: string;
  source: string;
}

export interface CopyItem {
  title: string;
  body: string;
  compliance: string;
}

export type TeamContentType = 'copy' | 'visual' | 'video' | 'ppt';

export interface TeamResult {
  contentType: TeamContentType;
  contentTitle: string;
  before: string;
  after: string;
  changes: string[];
  summary: string;
}

export interface VideoSegment {
  time: string;
  scene: string;
  narration: string;
  compliance?: string;
}

export interface VideoResult {
  title: string;
  segments: VideoSegment[];
  coverSuggestion?: string;
}

/** 根据脚本合成的视频方案（演示可为占位 MP4） */
export interface VideoRenderVersion {
  id: string;
  name: string;
  styleTag: string;
  description: string;
  duration: string;
  posterDataUrl: string;
  videoUrl: string;
  isDemo?: boolean;
}

export interface PptSlide {
  page: number;
  title: string;
  bullets: string[];
  speakerNotes?: string;
  svg?: string;
}

export interface PptResult {
  slides: PptSlide[];
  title?: string;
}

export interface PptOutlinePage {
  id: string;
  title: string;
  bullets: string[];
  speakerNotes?: string;
}

export interface PptOutlineChapter {
  id: string;
  title: string;
  pages: PptOutlinePage[];
}

export interface PptOutline {
  title: string;
  audience: string;
  scenario: string;
  chapters: PptOutlineChapter[];
}

export interface PptDesignVersion {
  id: string;
  name: string;
  styleTag: string;
  description: string;
  slides: PptSlide[];
  coverDataUrl?: string;
}

export interface PosterResult {
  title: string;
  svg: string;
  dataUrl: string;
}
