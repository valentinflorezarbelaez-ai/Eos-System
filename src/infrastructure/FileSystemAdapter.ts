import * as fs from 'node:fs';
import * as path from 'node:path';

export interface IFileSystemAdapter {
  readFile(filePath: string): string;
  readBuffer(filePath: string): Buffer;
  writeFile(filePath: string, content: string): void;
  writeJson(filePath: string, data: unknown): void;
  readJson<T>(filePath: string): T;
  exists(filePath: string): boolean;
  ensureDirectory(dirPath: string): void;
}

/**
 * FileSystemAdapter (Infrastructure Layer)
 * Manages atomic local file I/O behind an abstract interface.
 */
export class FileSystemAdapter implements IFileSystemAdapter {
  readFile(filePath: string): string {
    return fs.readFileSync(filePath, 'utf-8');
  }

  readBuffer(filePath: string): Buffer {
    return fs.readFileSync(filePath);
  }

  writeFile(filePath: string, content: string): void {
    const parent = path.dirname(filePath);
    if (!fs.existsSync(parent)) {
      fs.mkdirSync(parent, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  writeJson(filePath: string, data: unknown): void {
    const serialized = JSON.stringify(data, null, 2);
    this.writeFile(filePath, serialized);
  }

  readJson<T>(filePath: string): T {
    const raw = this.readFile(filePath);
    return JSON.parse(raw) as T;
  }

  exists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  ensureDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}
