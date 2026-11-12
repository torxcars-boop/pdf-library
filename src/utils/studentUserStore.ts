import { User } from '../types';
import { dispatchContentChanged } from './contentStore';

const REGISTERED_STUDENTS_KEY = 'arm_registered_students_v2';
export const STUDENT_REGISTERED_EVENT = 'arm_student_registered_sync';

// 100% Real student accounts only - no demo accounts
const DEFAULT_STUDENT_ACCOUNTS: User[] = [];

export const getRegisteredStudents = (): User[] => {
  try {
    const raw = localStorage.getItem(REGISTERED_STUDENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const realOnly = parsed.filter((u: User) => !String(u.id).startsWith('std_demo_'));
        if (realOnly.length !== parsed.length) {
          localStorage.setItem(REGISTERED_STUDENTS_KEY, JSON.stringify(realOnly));
        }
        return realOnly;
      }
    }
  } catch (e) {
    console.error('Error reading registered students', e);
  }
  return DEFAULT_STUDENT_ACCOUNTS;
};

export const saveRegisteredStudent = (user: User): void => {
  if (!user || !user.id) return;
  try {
    const students = getRegisteredStudents();
    const idx = students.findIndex(s => s.id === user.id || s.email?.toLowerCase() === user.email?.toLowerCase());
    
    const existingStudent = idx >= 0 ? students[idx] : null;
    const userToSave: User = {
      ...existingStudent,
      ...user,
      // CRITICAL: Preserve original creation date and subscription to avoid resetting or prematurely expiring 10-day trial!
      createdAt: user.createdAt || existingStudent?.createdAt || new Date().toISOString(),
      subscription: user.subscription || existingStudent?.subscription,
      status: user.status || existingStudent?.status || 'active',
      role: user.role || existingStudent?.role || 'user',
      academicStage: user.academicStage || existingStudent?.academicStage || 'طالب ثانوية عامة',
    };

    if (idx >= 0) {
      students[idx] = userToSave;
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
