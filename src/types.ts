export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Paper {
  id: string;
  course: string;
  branch: string;
  subject: string;
  subjectCode: string;
  year: string;
  examYear: string;
  semester: string;
  uploadedBy: string;
  uploaderName: string;
  uploadDate: string;
  fileUrl: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
