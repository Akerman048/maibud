export type ProjectStatus =
  | "open"
  | "processed"
  | "resolved"
  | "returned"
  | "overdue";

export type Project = {
  id: string;
  name: string;
  address: string;
  customer: string;
  stage: string;
  expert: string;
  deadline: string;
  status: ProjectStatus;
};

export const mockProjects: Project[] = [
  {
    id: "1",
    name: "ЖК «Подільські вежі»",
    address: "вул. Кирилівська, 41, м. Київ",
    customer: "ТОВ «Поділ Девелопмент»",
    stage: "Експертиза",
    expert: "Коваль Олег",
    deadline: "08.07.2026",
    status: "open",
  },
  {
    id: "2",
    name: "БЦ «Либідь Плаза»",
    address: "просп. Науки, 12, м. Київ",
    customer: "ТОВ «Либідь Інвест»",
    stage: "Зауваження",
    expert: "Мельник Ірина",
    deadline: "04.07.2026",
    status: "overdue",
  },
  {
    id: "3",
    name: "ТРЦ «Дніпро Молл»",
    address: "вул. Набережна, 18, м. Дніпро",
    customer: "ТОВ «Дніпро Рітейл»",
    stage: "Завершено",
    expert: "Шевченко Андрій",
    deadline: "28.06.2026",
    status: "resolved",
  },
];