import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { initCommand, listCommand, newCommand, attachCommand, killCommand, renameCommand } from "./commands/index.js";

/**
 * CLI 入口
 */
export function runCli(): void {
    yargs(hideBin(process.argv))
        .scriptName("th")
        .usage("$0 <command> [options]")
        .command(
            "init",
            "初始化 TerminalHub 配置文件",
            () => {},
            () => {
                initCommand();
            }
        )
        .command(
            "list",
            "列出所有活跃会话",
            () => {},
            async () => {
                await listCommand();
            }
        )
        .command(
            "new [title]",
            "创建新的终端会话",
            (yargs) => {
                return yargs.positional("title", {
                    type: "string",
                    description: "会话标题"
                });
            },
            async (argv) => {
                await newCommand(argv.title as string | undefined);
            }
        )
        .command(
            "attach <session-id>",
            "连接到现有会话",
            (yargs) => {
                return yargs.positional("session-id", {
                    type: "string",
                    description: "会话 ID",
                    demandOption: true
                });
            },
            async (argv) => {
                await attachCommand(argv["session-id"] as string);
            }
        )
        .command(
            "kill <session-id>",
            "终止会话",
            (yargs) => {
                return yargs.positional("session-id", {
                    type: "string",
                    description: "会话 ID",
                    demandOption: true
                });
            },
            async (argv) => {
                await killCommand(argv["session-id"] as string);
            }
        )
        .command(
            "rename <session-id> <new-title>",
            "重命名会话",
            (yargs) => {
                return yargs
                    .positional("session-id", {
                        type: "string",
                        description: "会话 ID",
                        demandOption: true
                    })
                    .positional("new-title", {
                        type: "string",
                        description: "新标题",
                        demandOption: true
                    });
            },
            async (argv) => {
                await renameCommand(argv["session-id"] as string, argv["new-title"] as string);
            }
        )
        .demandCommand(1, "请指定一个命令")
        .strict()
        .help()
        .alias("help", "h")
        .alias("version", "v")
        .parse();
}
