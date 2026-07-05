export const mockDocuments = [
  {
    id: "1",
    name: "Проєктна документація.pdf",
    project: "ЖК «Подільські вежі»",
    type: "PDF",
    status: "Актуальна",
  },
  {
    id: "2",
    name: "Розділ газопостачання.dwg",
    project: "ЖК «Подільські вежі»",
    type: "DWG",
    status: "Потребує оновлення",
  },
  {
    id: "3",
    name: "Експертний висновок.docx",
    project: "БЦ «Либідь Плаза»",
    type: "DOCX",
    status: "Готово",
  },
] as const;