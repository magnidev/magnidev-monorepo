import colors from "picocolors";

// #region - @formatSections
/**
 * @description Formats and displays an array of sections, each containing a title and items.
 * @param sections - An array of sections, each containing a title and items.
 * @returns A formatted string representing the sections and their items.
 */
export const formatSections = (
  data: {
    sections: {
      title: string;
      items: {
        label: string;
        value?: string;
        items?: {
          label: string;
          value: string;
        }[];
      }[];
    }[];
  },
  options = {}
): string => {
  const { sections } = data;

  if (!sections || sections.length === 0) {
    return "No information to display.";
  }

  const formattedSections = sections.map(({ title, items }, idx) => {
    const formattedItems = items.map(({ label, value, items }) => {
      const formattedLabel = colors.green(label + ":");
      if (items && items.length > 0) {
        const formattedItems = items
          .map((item) => `  - ${colors.green(item.label + ":")} ${item.value}`)
          .join("\n");
        return `- ${formattedLabel}\n${formattedItems}`;
      }
      return `- ${formattedLabel} ${value}`;
    });
    return `${idx != 0 ? "\n" : ""}* ${colors.bold(title)} *\n${formattedItems.join("\n")}`;
  });

  return formattedSections.join("\n");
};
// #endregion - @formatSections
