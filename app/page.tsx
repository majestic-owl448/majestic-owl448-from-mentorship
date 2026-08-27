import { AuthButtons } from "./components/authButtons";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
          Stamp Inventory
        </p>
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Keep a clear record of every stamp you own.
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Record your collection by country and calculate the current postage
            value of the stamps you can use.
          </p>
        </div>
        <AuthButtons />
        <p className="text-sm text-zinc-500">Inventory features are in development.</p>
      </main>
    </div>
  );
}
