export default function RegisterPage() {
  return (
    <div className="max-w-sm mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6 text-center">Inscription</h1>
      <form className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
        <div>
          <label className="block text-sm mb-1" htmlFor="name">Nom</label>
          <input
            id="name"
            type="text"
            className="w-full rounded-lg px-3 py-2 bg-white/10 border border-white/10 text-white placeholder-white/40 focus:outline-none"
            placeholder="Votre nom"
            disabled
          />
        </div>
        <div>
          <label className="block text-sm mb-1" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="w-full rounded-lg px-3 py-2 bg-white/10 border border-white/10 text-white placeholder-white/40 focus:outline-none"
            placeholder="Votre email"
            disabled
          />
        </div>
        <div>
          <label className="block text-sm mb-1" htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            className="w-full rounded-lg px-3 py-2 bg-white/10 border border-white/10 text-white placeholder-white/40 focus:outline-none"
            placeholder="Votre mot de passe"
            disabled
          />
        </div>
        <button
          type="button"
          disabled
          className="w-full rounded-lg px-6 py-2 bg-indigo-600/40 text-white/70 font-semibold cursor-not-allowed opacity-60"
        >
          Créer un compte (à venir)
        </button>
      </form>
    </div>
  );
}
