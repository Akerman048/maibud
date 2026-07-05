export type ArchiveProjectStatus = "incomplete" | "closed";

export type ArchiveProject = {
  id: string;
  name: string;
  documentsTotal: number;
  documentsArchived: number;
  status: ArchiveProjectStatus;
  overduePromises: number;
};

export const mockArchiveProjects: ArchiveProject[] = [
  {
    id: "1",
    name: "ЖК «Подільські вежі»",
    documentsTotal: 18,
    documentsArchived: 12,
    status: "incomplete",
    overduePromises: 2,
  },
  {
    id: "2",
    name: "ЖК «Оболонь Резиденс»",
    documentsTotal: 16,
    documentsArchived: 15,
    status: "incomplete",
    overduePromises: 1,
  },
  {
    id: "3",
    name: "ТРЦ «Дніпро Молл»",
    documentsTotal: 22,
    documentsArchived: 22,
    status: "closed",
    overduePromises: 0,
  },
];