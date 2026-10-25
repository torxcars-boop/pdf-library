import { User } from '../types';
import { dispatchContentChanged } from './contentStore';

const REGISTERED_STUDENTS_KEY = 'arm_registered_students_v2';
export const STUDENT_REGISTERED_EVENT = 'arm_student_registered_sync';

// Default initial students so the Admin Portal always has student data even on fresh start
const DEFAULT_STUDENT_ACCOUNTS: User[] = [
  {
    id: 'std_demo_1',
    name: 'أحمد محمد العوضي',
    email: 'ahmed.awadi@student.edu.eg',
    role: 'user',
    status: 'active',
    academicStage: 'الثانوية العامة - علمي علوم',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'std_demo_2',
    name: 'مريم محمود الشافعي',
    email: 'mariam.shafey@student.edu.eg',
    role: 'user',
    status: 'active',
    academicStage: 'الثانوية العامة - علمي رياضة',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'std_demo_3',
    name: 'يوسف طارق المنشاوي',
    email: 'youssef.menshawy@student.edu.eg',
    role: 'user',
    status: 'active',
    academicStage: 'الثانوية العامة - أدبي',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const getRegisteredStudents = (): User[] => {
  try {
    const raw = localStorage.getItem(REGISTERED_STUDENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading registered students', e);
  }
  // Initialize with defaults if empty
  try {
    localStorage.setItem(REGISTERED_STUDENTS_KEY, JSON.stringify(DEFAULT_STUDENT_ACCOUNTS));
  } catch (e) {}
  return DEFAULT_STUDENT_ACCOUNTS;
};

export const saveRegisteredStudent = (user: User): void => {
  if (!user || !user.id) return;
  try {
    const students = getRegisteredStudents();
    const idx = students.findIndex(s => s.id === user.id || s.email?.toLowerCase() === user.email?.toLowerCase());
    
    const userToSave: User = {
      ...user,
      status: user.status || 'active',
      role: user.role || 'user',
      academicStage: user.academicStage || 'طالب ثانوية عامة',
      createdAt: user.createdAt || new Date().toISOString()
    };

    if (idx >= 0) {
      students[idx] = { ...students[idx], ...userToSave };
    } else {
      students.unshift(userToSave);
    }

    localStorage.setItem(REGISTERED_STUDENTS_KEY, JSON.stringify(students));
    window.dispatchEvent(new CustomEvent(STUDENT_REGISTERED_EVENT, { detail: userToSave }));
    dispatchContentChanged();
  } catch (e) {
    console.error('Error saving registered student', e);
  }
};

export const updateStudentStatus = (userId: string, status: 'active' | 'suspended', role?: string): boolean => {
  try {
    const students = getRegisteredStudents();
    const student = students.find(s => s.id === userId);
    if (!student) return false;

    student.status = status;
    if (role) student.role = role as any;

    localStorage.setItem(REGISTERED_STUDENTS_KEY, JSON.stringify(students));
    
    // Also update arm_current_user if it matches
    const curRaw = localStorage.getItem('arm_current_user');
    if (curRaw) {
      const cur = JSON.parse(curRaw);
      if (cur.id === userId) {
        cur.status = status;
        if (role) cur.role = role;
        localStorage.setItem('arm_current_user', JSON.stringify(cur));
      }
    }

    window.dispatchEvent(new CustomEvent(STUDENT_REGISTERED_EVENT));
    dispatchContentChanged();
    return true;
  } catch (e) {
    console.error('Error updating student status', e);
    return false;
  }
};

export const deleteStudentLocally = (userId: string): boolean => {
  try {
    let students = getRegisteredStudents();
    students = students.filter(s => s.id !== userId);
    localStorage.setItem(REGISTERED_STUDENTS_KEY, JSON.stringify(students));
    window.dispatchEvent(new CustomEvent(STUDENT_REGISTERED_EVENT));
    dispatchContentChanged();
    return true;
  } catch (e) {
    console.error('Error deleting student locally', e);
    return false;
  }
};
