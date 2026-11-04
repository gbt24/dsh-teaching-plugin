/**
 * Built-in catalog for environments beyond the first-version three languages.
 *
 * Ruby, Lua and Deno are lightweight runtimes that need no compilation and can
 * be isolated with a plugin-owned directory plus environment variables (gem /
 * module / cache home). The catalog contains data only: probing and execution
 * live in the manager so every fact comes from a real process.
 *
 * Go is included as a *known but absent* toolchain: installing it is a system
 * change and must be presented to the student, never executed silently.
 */
import { join } from 'node:path'
import type { EnvironmentApproval, ExtendedLanguageSpec, SystemInstallPlanSpec } from './types.ts'

/** Extract the first version-looking token from combined probe output. */
function firstVersion(output: string, pattern: RegExp): string | undefined {
  return pattern.exec(output)?.[1]
}

/** Ruby: gem dependencies stay inside the managed directory. */
const RUBY_SPEC: ExtendedLanguageSpec = {
  language: 'ruby',
  label: 'Ruby',
  executables: ['ruby'],
  versionArgs: ['--version'],
  parseVersion: output => firstVersion(output, /ruby\s+(\d+\.\d+\.\d+)/u),
  scriptExtension: 'rb',
  runArgs: [],
  smokeProgram: 'x = 21\nputs x * 2\n',
  expectedSmokeStdout: '42',
  prepareDirs: ['work', 'gems', 'gem-cache'],
  isolationEnv: dir => ({
    GEM_HOME: join(dir, 'gems'),
    GEM_PATH: join(dir, 'gems'),
    GEM_SPEC_CACHE: join(dir, 'gem-cache'),
  }),
  isolationNote: 'gem 依赖目录（GEM_HOME/GEM_PATH）指向插件数据目录；不写用户或系统 gem 目录',
  network: 'unknown',
  confinementNote: '当前用户身份子进程；无 CPU/内存配额；超时与取消会结束整个进程组',
}

/** Lua: module search paths point at the managed directory, then the defaults. */
const LUA_SPEC: ExtendedLanguageSpec = {
  language: 'lua',
  label: 'Lua',
  executables: ['lua', 'luajit'],
  versionArgs: ['-v'],
  parseVersion: output => firstVersion(output, /(?:Lua|LuaJIT)\s+(\d+\.\d+(?:\.\d+)?)/u),
  scriptExtension: 'lua',
  runArgs: [],
  smokeProgram: 'print(21 * 2)\n',
  expectedSmokeStdout: '42',
  prepareDirs: ['work', 'lua'],
  isolationEnv: dir => ({
    LUA_PATH: `${join(dir, 'lua', '?.lua')};${join(dir, 'lua', '?', 'init.lua')};;`,
    LUA_CPATH: `${join(dir, 'lua', '?.so')};;`,
  }),
  isolationNote: 'Lua 模块路径（LUA_PATH/LUA_CPATH）指向插件数据目录，并以 ;; 保留系统默认路径',
  network: 'unknown',
  confinementNote: '当前用户身份子进程；无 CPU/内存配额；超时与取消会结束整个进程组',
}

/** Deno: no network permission is granted; caches live inside the managed dir. */
const DENO_SPEC: ExtendedLanguageSpec = {
  language: 'deno',
  label: 'Deno',
  executables: ['deno'],
  versionArgs: ['--version'],
  parseVersion: output => firstVersion(output, /deno\s+(\d+\.\d+\.\d+)/u),
  scriptExtension: 'ts',
  runArgs: ['run', '--quiet'],
  smokeProgram: 'console.log(21 * 2)\n',
  expectedSmokeStdout: '42',
  prepareDirs: ['work', 'deno'],
  isolationEnv: dir => ({
    DENO_DIR: join(dir, 'deno'),
    DENO_NO_UPDATE_CHECK: '1',
  }),
  isolationNote: 'Deno 缓存目录（DENO_DIR）指向插件数据目录；未授予 --allow-net 网络权限',
  network: 'unknown',
  confinementNote: '当前用户身份子进程；未授权网络/写文件权限；无 CPU/内存配额；超时与取消会结束整个进程组',
}

/** Extended adapters that ship with T06. Order defines the directory listing. */
export const EXTENDED_LANGUAGE_SPECS: readonly ExtendedLanguageSpec[] = [RUBY_SPEC, LUA_SPEC, DENO_SPEC]

/** Approval plans for toolchains the plugin recognizes but does not bundle. */
const GO_INSTALL_PLAN: SystemInstallPlanSpec = {
  language: 'go',
  label: 'Go',
  executables: ['go'],
  approval: {
    kind: 'system-change',
    description: '本机未检测到 Go 工具链。安装 Go 属于系统级改动，会写入全局可执行路径；插件不会代你执行。',
    impact: [
      '新增全局可执行文件（go、gofmt），可能被其他项目共享或产生版本冲突',
      '安装包与依赖占用磁盘，后续升级/卸载由学生自己管理',
      '插件无法保证安装命令、版本与网络在当前机器上可用',
    ],
    alternatives: [
      '改用 Python 或 JavaScript 完成同一教学目标',
      '在插件数据目录内使用便携式方案（需联网下载与磁盘空间，第一版未自动实现）',
      '学生自行安装 Go 后回到插件重新探测；不需要重装插件',
    ],
    commandPreview: 'brew install go',
    requiresNetwork: true,
    executableByPlugin: false,
    note: '命令仅作说明，未在本机验证成功；插件不执行系统包管理器。',
  },
}

/** Approval plans for the extended catalog when their runtime is absent. */
const CATALOG_INSTALL_PLANS: readonly SystemInstallPlanSpec[] = [
  {
    language: 'ruby',
    label: 'Ruby',
    executables: ['ruby', 'gem'],
    approval: {
      kind: 'system-change',
      description: '本机未检测到 Ruby 运行时。安装 Ruby 属于系统级改动（或需要下载便携运行时），插件不会静默执行。',
      impact: [
        '系统级包管理器会写入全局路径，影响其他项目与后续升级',
        '便携运行时需要联网下载并占用磁盘，来源与校验由学生决定',
      ],
      alternatives: [
        '改用 Python/JavaScript 完成同一实验',
        '学生自行安装 Ruby（系统包管理器或版本管理器）后重新探测',
        '若课程只需要脚本演示，可退化为逐行走查并明确标注未真实运行',
      ],
      requiresNetwork: true,
      executableByPlugin: false,
      note: '插件不执行 brew/系统包管理器，也不自动下载解释器。',
    },
  },
  {
    language: 'lua',
    label: 'Lua',
    executables: ['lua', 'luajit'],
    approval: {
      kind: 'system-change',
      description: '本机未检测到 Lua 解释器。安装 Lua 属于系统级改动，插件不会静默执行。',
      impact: ['写入全局可执行路径，可能与已有 LuaJIT/版本冲突', '需要网络下载安装包'],
      alternatives: ['改用 Python/JavaScript 完成同一实验', '学生自行安装 Lua 后重新探测'],
      commandPreview: 'brew install lua',
      requiresNetwork: true,
      executableByPlugin: false,
      note: '命令仅作说明，未在本机验证成功。',
    },
  },
  {
    language: 'deno',
    label: 'Deno',
    executables: ['deno'],
    approval: {
      kind: 'system-change',
      description: '本机未检测到 Deno。安装 Deno 属于系统级改动，插件不会静默执行。',
      impact: ['写入全局可执行路径；Deno 版本升级策略由学生管理', '安装脚本需要网络'],
      alternatives: ['改用 JavaScript（宿主内置 Node）完成同一实验', '学生自行安装 Deno 后重新探测'],
      commandPreview: 'brew install deno',
      requiresNetwork: true,
      executableByPlugin: false,
      note: '命令仅作说明，未在本机验证成功。',
    },
  },
  GO_INSTALL_PLAN,
]

/** Combined install plans (catalog + Go) for lookups. */
export const DEFAULT_INSTALL_PLANS: readonly SystemInstallPlanSpec[] = CATALOG_INSTALL_PLANS

/** Approval used when a third-party dependency would have to be downloaded. */
export function networkInstallApproval(language: string, dependencies: readonly string[]): EnvironmentApproval {
  const list = dependencies.join('、')
  return {
    kind: 'network-install',
    description: `实验声明了第三方依赖（${list}）。依赖需要联网下载到插件管理的独立目录（${language}），第一版不会静默安装。`,
    impact: [
      '需要网络可达；镜像源、版本与校验结果会影响可复现性',
      '依赖会占用插件数据目录磁盘空间，来源不同可能带来安全风险',
      '安装失败不会破坏已有环境；可改用不依赖第三方包的等价实验',
    ],
    alternatives: [
      '改用标准库/内置能力即可完成的等价实验',
      '学生确认后由后续集成提供受控安装入口（当前版本仅给出说明）',
      '继续使用已安装的依赖（如插件已内置）并跳过自动安装',
    ],
    requiresNetwork: true,
    executableByPlugin: false,
    note: '当前版本不自动执行网络依赖安装；没有成功率的保证。',
  }
}

/** Approval used when an optional plugin-bundled dependency is missing. */
export function pluginRepairApproval(language: string, detail: string): EnvironmentApproval {
  return {
    kind: 'plugin-repair',
    description: `${detail}（${language} 依赖属于插件包的一部分，不需要系统级安装。）`,
    impact: ['需要重新安装/修复插件包，学习数据不受影响', '修复前该语言的实验不能真实运行'],
    alternatives: [
      '在插件管理里重新安装相同版本的插件包',
      '暂时改用 Python/JavaScript 完成教学，并明确标注 Scheme 未运行',
    ],
    requiresNetwork: false,
    executableByPlugin: false,
    note: '插件不会自行修改自己的安装目录。',
  }
}

/** Approval used when a first-version language runtime is absent from the host. */
export function systemRuntimeApproval(language: string, missingReason: string): EnvironmentApproval {
  const label = language === 'python' ? 'Python 3' : language === 'javascript' ? 'Node.js' : language
  return {
    kind: 'system-change',
    description: `${missingReason} 安装 ${label} 属于系统级改动，插件不会代你执行。`,
    impact: [
      '安装会写入全局路径，影响其他项目与后续版本管理',
      '需要网络下载安装包',
      '插件无法保证安装命令与版本在每台机器上可用',
    ],
    alternatives: [
      language === 'python'
        ? '改用 JavaScript 或 Scheme 完成同一实验'
        : '改用其余已就绪语言完成同一实验',
      '学生自行安装运行时后重新探测（不需要重装插件）',
    ],
    requiresNetwork: true,
    executableByPlugin: false,
    note: '第一版不自动下载解释器，也不执行系统包管理器；不提供安装成功率保证。',
  }
}

/** Find the extended adapter spec for a language. */
export function findExtendedSpec(
  language: string,
  adapters: readonly ExtendedLanguageSpec[] = EXTENDED_LANGUAGE_SPECS,
): ExtendedLanguageSpec | undefined {
  return adapters.find(spec => spec.language === language)
}

/** Find the system install plan for a language. */
export function findInstallPlan(
  language: string,
  plans: readonly SystemInstallPlanSpec[] = DEFAULT_INSTALL_PLANS,
): SystemInstallPlanSpec | undefined {
  return plans.find(plan => plan.language === language)
}
