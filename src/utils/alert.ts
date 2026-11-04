import Swal, { SweetAlertIcon } from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

export const alertSuccess = (title: string, text?: string, timer: number = 1500) =>
  Swal.fire({ 
    icon: 'success', 
    title, 
    text,
    timer,
    showConfirmButton: false
  });

export const alertError = (title: string, text?: string) =>
  Swal.fire({ icon: 'error', title, text });

export const alertInfo = (title: string, text?: string) =>
  Swal.fire({ icon: 'info', title, text });

export const alertConfirm = async (title: string, text?: string, confirmButtonText = 'Yes', cancelButtonText = 'Cancel') => {
  const result = await Swal.fire({
    title,
    text,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
  });
  return result.isConfirmed;
};

export const toast = (title: string, icon: SweetAlertIcon = 'success') =>
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon,
    title,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });

export const alertPrompt = async (title: string, inputLabel: string, inputPlaceholder = '', confirmButtonText = 'Submit', cancelButtonText = 'Cancel') => {
  const result = await Swal.fire({
    title,
    input: 'textarea',
    inputLabel,
    inputPlaceholder,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    confirmButtonColor: '#ef4444', // Red button for rejection/destructive actions
    cancelButtonColor: '#6b7280', // Gray button for cancel
    reverseButtons: true,
    inputValidator: (value) => {
      if (!value || !value.trim()) {
        return 'Please enter a valid value!';
      }
    }
  });
  return result.isConfirmed && result.value ? result.value.trim() : null;
};

export default {
  success: alertSuccess,
  error: alertError,
  info: alertInfo,
  confirm: alertConfirm,
  prompt: alertPrompt,
  toast,
};


