/**
 * EditPOVToggleMenuItem Component
 *
 * Toggle menu item for enabling/disabling POV editing mode.
 * When enabled, POV capture buttons become visible in popups and modals.
 */

import { useEditPOVContext } from '@/contexts/EditPOVContext';

export const EditPOVToggleMenuItem = () => {
  const { isEditMode, toggleEditMode } = useEditPOVContext();

  return (
    <button
      onClick={toggleEditMode}
      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-start text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
      role="menuitemcheckbox"
      aria-checked={isEditMode}
      type="button"
    >
      <div className="flex items-center gap-3">
        <span className="text-gray-500 dark:text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </span>
        <span>Edit POVs</span>
      </div>

      {/* Toggle Switch */}
      <div
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          isEditMode ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
        aria-hidden="true"
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isEditMode ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </div>
    </button>
  );
};
