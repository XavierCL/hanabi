import { AbstractAi } from "../../gameAi/AbstractAi";

export const getInternalInfo = (
  ais: AbstractAi[],
  aiNames: string[]
): Record<string, Record<string, string>> => {
  const infos = ais.map((ai) => ai.getInternalInfo?.() ?? {});

  const globalInfo: Record<string, Record<string, string>> = {};

  infos.forEach((aiInfo, aiIndex) => {
    Object.entries(aiInfo).forEach(([cardId, cardInfo]) => {
      if (!(cardId in globalInfo)) {
        globalInfo[cardId] = {};
      }

      globalInfo[cardId][aiNames[aiIndex]] = cardInfo;
    });
  });

  return globalInfo;
};
