import { LoaderCircle, Store } from 'lucide-react';

export function LoaderAnimation({
  message = 'Preparing your showroom',
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <LoaderCircle
          className="absolute h-16 w-16 animate-spin text-brown/35"
          strokeWidth={1.5}
        />
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brown text-white shadow-soft">
          <Store className="h-5 w-5" />
        </div>
      </div>
      <p className="text-sm font-medium text-muted">{message}</p>
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function PageLoader({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ivory/95 backdrop-blur-sm">
      <LoaderAnimation message={message} />
    </div>
  );
}
