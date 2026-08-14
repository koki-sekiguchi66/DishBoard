#!/usr/bin/env node
/**
 * PreToolUse ガード。
 *
 * CLAUDE.md の指示は「読まれれば守られる」程度の強制力しかない。
 * 秘密情報の露出のように一度やると取り返しがつかないものは、ここで決定論的に止める。
 *
 * 判定結果:
 *   - deny     … exit 2 でツール呼び出しをブロック（.env / SSH 秘密鍵 / docs の git add）
 *   - escalate … ユーザーに許可を求める（本番構成ファイルの編集）
 *   - 何もなし … exit 0 で通常フローへ
 */

const FILE_TOOLS = new Set(["Read", "Edit", "Write", "NotebookEdit"]);
const SHELL_TOOLS = new Set(["Bash", "PowerShell"]);

// 本番構成。無断で変えると利用者に影響するため、編集時はユーザーに確認を取らせる
const PRODUCTION_FILES = [/docker-compose\.production\.yml$/i, /[/\\]nginx[/\\]conf\.d[/\\]/i];

/** .env 系のうち、プレースホルダのみのテンプレートは対象外 */
function isSecretEnv(name) {
  if (!/^\.env(\.|$)/.test(name)) return false;
  return !name.endsWith(".example");
}

/** SSH 秘密鍵とみられるファイル名（.pub は公開鍵なので除く） */
function isPrivateKey(name) {
  if (/\.(pem|key|p12|pfx)$/i.test(name)) return true;
  return /^id_(rsa|dsa|ecdsa|ed25519)$/i.test(name);
}

function baseName(p) {
  return String(p).replace(/[/\\]+$/, "").split(/[/\\]/).pop() || "";
}

/** シェルコマンド中に現れるパスらしきトークンを拾う */
function tokensIn(command) {
  return String(command)
    .split(/[\s;|&()<>"']+/)
    .filter(Boolean)
    .map(baseName);
}

function checkFilePath(filePath) {
  const name = baseName(filePath);
  if (isSecretEnv(name)) {
    return {
      decision: "deny",
      reason:
        `${name} は秘密情報を含むためアクセスを禁止している。` +
        `必要な変数名は .env.production.example で確認し、実値はユーザーに操作してもらうこと。`,
    };
  }
  if (isPrivateKey(name)) {
    return { decision: "deny", reason: `${name} は秘密鍵とみられるためアクセスを禁止している。` };
  }
  if (PRODUCTION_FILES.some((re) => re.test(String(filePath)))) {
    return {
      decision: "escalate",
      reason:
        `${filePath} は本番構成ファイル。変更は稼働中のサービスに影響するため、ユーザーの承認が必要。`,
    };
  }
  return null;
}

function checkCommand(command) {
  const cmd = String(command);
  const names = tokensIn(cmd);

  const env = names.find(isSecretEnv);
  if (env) {
    return {
      decision: "deny",
      reason: `コマンドが ${env} を参照している。.env の内容は読み取らないこと（テンプレートは .env.production.example）。`,
    };
  }

  const key = names.find(isPrivateKey);
  if (key) {
    return { decision: "deny", reason: `コマンドが秘密鍵 ${key} を参照している。` };
  }

  // docs/ は .gitignore 済み。-f で強制ステージされるのを防ぐ
  if (/\bgit\s+add\b/.test(cmd) && /(^|[\s"'/\\])docs[/\\]/.test(cmd)) {
    return {
      decision: "deny",
      reason: "docs/ は Git 管理外の方針。設計の生々しい経緯を含むため git add しないこと。",
    };
  }

  return null;
}

function main() {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => (raw += chunk));
  process.stdin.on("end", () => {
    let input;
    try {
      input = JSON.parse(raw);
    } catch {
      // 入力が読めないときは黙って通す（ガードの誤動作で開発を止めない）
      process.exit(0);
    }

    const toolName = input.tool_name || "";
    const toolInput = input.tool_input || {};
    let result = null;

    if (FILE_TOOLS.has(toolName)) {
      const target = toolInput.file_path || toolInput.notebook_path;
      if (target) result = checkFilePath(target);
    } else if (SHELL_TOOLS.has(toolName)) {
      if (toolInput.command) result = checkCommand(toolInput.command);
    }

    if (!result) process.exit(0);

    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: result.decision,
          permissionDecisionReason: result.reason,
        },
      })
    );

    if (result.decision === "deny") {
      process.stderr.write(result.reason + "\n");
      process.exit(2);
    }
    process.exit(0);
  });
}

main();
