import colors from "picocolors";

/**
 * @description The intro message displayed when the CLI starts.
 */
export const introMessage = colors.white(`
██████╗ ███████╗██████╗  ██████╗      ██████╗██╗     ██╗
██╔══██╗██╔════╝██╔══██╗██╔═══██╗    ██╔════╝██║     ██║
██████╔╝█████╗  ██████╔╝██║   ██║    ██║     ██║     ██║
██╔══██╗██╔══╝  ██╔═══╝ ██║   ██║    ██║     ██║     ██║
██║  ██║███████╗██║     ╚██████╔╝    ╚██████╗███████╗██║
╚═╝  ╚═╝╚══════╝╚═╝      ╚═════╝      ╚═════╝╚══════╝╚═╝`);

/**
 * @description The outro message displayed when the CLI finishes executing.
 */
export const outroMessage = colors.white(
  "🚀 Repo CLI by @magnidev, happy coding!"
);

export const dryRunMessage = colors.white(
  `Dry run mode ${colors.blue("enabled")}.`
);
