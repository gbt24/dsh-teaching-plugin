/**
 * 受控子进程执行：OCR/页面渲染等宿主工具调用。
 *
 * 约束：不使用 shell 拼接命令；超时或取消会终止子进程并返回明确结果；
 * 任何缺失的工具都作为「能力不可用」由调用方报告，而不是抛异常崩溃。
 */
import { spawn } from 'node:child_process'
import { constants as fsConstants } from 'node:fs'
import { access } from 'node:fs/promises'
import { delimiter, join } from 'node:path'

/** 子进程执行选项。 */
export interface RunCommandOptions {
  readonly signal?: AbortSignal
  readonly timeoutMs?: number
  readonly cwd?: string
  /** 输出上限（字符），防止异常工具刷爆内存。 */
  readonly maxOutputChars?: number
}

/** 子进程执行结果；failed 表示无法启动（命令不存在/权限）。 */
export interface RunCommandResult {
  readonly code: number | null
  readonly stdout: string
  readonly stderr: string
  readonly timedOut: boolean
  readonly aborted: boolean
  readonly failed: boolean
}

/** 执行一个命令并收集输出；不重试。 */
export async function runCommand(
  command: string,
  args: readonly string[],
  options: RunCommandOptions = {},
): Promise<RunCommandResult> {
  const maxOutputChars = options.maxOutputChars ?? 8 * 1024 * 1024
  return await new Promise<RunCommandResult>((resolve) => {
    let stdout = ''
    let stderr = ''
    let timedOut = false
    let aborted = false
    let settled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let child: ReturnType<typeof spawn>
    try {
      child = spawn(command, [...args], {
        cwd: options.cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      })
    } catch (cause) {
      resolve({
        code: null, stdout: '', stderr: cause instanceof Error ? cause.message : String(cause),
        timedOut: false, aborted: false, failed: true,
      })
      return
    }
    const finish = (result: RunCommandResult): void => {
      if (settled) return
      settled = true
      if (timer !== undefined) clearTimeout(timer)
      options.signal?.removeEventListener('abort', onAbort)
      resolve(result)
    }
    const onAbort = (): void => {
      aborted = true
      child.kill('SIGKILL')
    }
    if (options.signal !== undefined) {
      if (options.signal.aborted) {
        child.kill('SIGKILL')
        finish({ code: null, stdout: '', stderr: '已取消', timedOut: false, aborted: true, failed: false })
        return
      }
      options.signal.addEventListener('abort', onAbort, { once: true })
    }
    if (options.timeoutMs !== undefined && options.timeoutMs > 0) {
      timer = setTimeout(() => {
        timedOut = true
        child.kill('SIGKILL')
      }, options.timeoutMs)
    }
    child.stdout?.on('data', (chunk: Buffer) => {
      if (stdout.length < maxOutputChars) stdout += chunk.toString('utf8')
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      if (stderr.length < maxOutputChars) stderr += chunk.toString('utf8')
    })
    child.on('error', cause => {
      finish({
        code: null, stdout, stderr: `${stderr}${cause.message}`, timedOut, aborted, failed: true,
      })
    })
    child.on('close', code => {
      finish({ code, stdout, stderr, timedOut, aborted, failed: false })
    })
  })
}

/** 在 PATH 与已知安装位置中查找可执行文件；找不到返回 undefined。 */
export async function whichTool(name: string, explicitPath?: string): Promise<string | undefined> {
  const candidates: string[] = []
  if (explicitPath !== undefined && explicitPath !== '') candidates.push(explicitPath)
  const pathEnv = process.env.PATH ?? ''
  for (const dir of pathEnv.split(delimiter)) {
    if (dir !== '') candidates.push(join(dir, name))
  }
  candidates.push(`/opt/homebrew/bin/${name}`, `/usr/local/bin/${name}`, `/usr/bin/${name}`)
  for (const candidate of candidates) {
    try {
      await access(candidate, fsConstants.X_OK)
      return candidate
    } catch {
      // 继续尝试下一个候选路径
    }
  }
  return undefined
}
