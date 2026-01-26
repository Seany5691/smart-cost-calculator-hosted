import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ToastProvider from '@/components/ui/Toast/ToastProvider';
import { useToast } from '@/components/ui/Toast/useToast';

// Test component that uses the toast hook
function TestComponent() {
  const { toast } = useToast();

  return (
    <div>
      <button onClick={() => toast.success('Success message')}>
        Show Success
      </button>
      <button onClick={() => toast.error('Error message')}>
        Show Error
      </button>
      <button onClick={() => toast.warning('Warning message')}>
        Show Warning
      </button>
      <button onClick={() => toast.info('Info message')}>
        Show Info
      </button>
      <button onClick={() => toast.info('Section message', { section: 'leads' })}>
        Show Section Toast
      </button>
    </div>
  );
}

describe('Toast Notification System', () => {
  it('should display success toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByText('Show Success');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });
  });

  it('should display error toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByText('Show Error');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  it('should display warning toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByText('Show Warning');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });
  });

  it('should display info toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByText('Show Info');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Info message')).toBeInTheDocument();
    });
  });

  it('should dismiss toast when close button is clicked', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByText('Show Success');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    const dismissButton = screen.getByLabelText('Dismiss notification');
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });
  });

  it('should auto-dismiss toast after duration', async () => {
    jest.useFakeTimers();

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByText('Show Success');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    // Fast-forward time by 3 seconds (default success duration)
    jest.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  it('should stack multiple toasts', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));
    fireEvent.click(screen.getByText('Show Warning'));

    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });
  });

  it('should limit toasts to maximum of 5', async () => {
    function MultiToastComponent() {
      const { toast } = useToast();

      return (
        <button
          onClick={() => {
            for (let i = 1; i <= 7; i++) {
              toast.info(`Toast ${i}`);
            }
          }}
        >
          Show Many Toasts
        </button>
      );
    }

    render(
      <ToastProvider>
        <MultiToastComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Many Toasts'));

    await waitFor(() => {
      // Should only show the last 5 toasts (3, 4, 5, 6, 7)
      expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Toast 2')).not.toBeInTheDocument();
      expect(screen.getByText('Toast 3')).toBeInTheDocument();
      expect(screen.getByText('Toast 4')).toBeInTheDocument();
      expect(screen.getByText('Toast 5')).toBeInTheDocument();
      expect(screen.getByText('Toast 6')).toBeInTheDocument();
      expect(screen.getByText('Toast 7')).toBeInTheDocument();
    });
  });

  it('should support section-specific colors', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByText('Show Section Toast');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Section message')).toBeInTheDocument();
    });

    // Check that the toast has section-specific styling (emerald for leads)
    const toast = screen.getByText('Section message').closest('div');
    expect(toast).toHaveClass('border-emerald-500/30');
  });

  it('should have ARIA live region for accessibility', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByText('Show Success');
    fireEvent.click(button);

    const liveRegion = screen.getByRole('alert');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
  });
});
