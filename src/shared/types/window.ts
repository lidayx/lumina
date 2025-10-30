import { BrowserWindow } from 'electron';

export interface WindowState {
  width: number;
  height: number;
  x: number;
  y: number;
  isMaximized: boolean;
}

export type WindowType = 'main' | 'settings' | 'plugin';

export interface WindowConfig {
  type: WindowType;
  url: string;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maximizable?: boolean;
  minimizable?: boolean;
  resizable?: boolean;
}

export interface WindowInfo {
  id: number;
  type?: string;
}
