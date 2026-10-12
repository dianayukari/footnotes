<template>
  <main class="centered">
    <div class="card">
      <slot />
    </div>
  </main>
</template>

<style scoped>
.centered {
  display: grid;
  place-items: center;
  height: 100%;
  padding: 24px;
  overflow-y: auto;
}

.card {
  width: min(100%, 420px);
  padding: 32px 28px;
  border-radius: 28px;
  text-align: center;
  background: #fafaf7;
  box-shadow: var(--shadow);
}

.card :deep(h1) {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 600;
}

.card :deep(p) {
  margin: 0 0 20px;
  line-height: 1.45;
  color: var(--text-muted);
}

.card :deep(.primary),
.card :deep(.secondary) {
  width: 100%;
  padding: 12px 16px;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 500;
}

.card :deep(.primary) {
  color: #fff;
  background: var(--accent);
}

.card :deep(.secondary) {
  margin-top: 10px;
  background: var(--control);
}

.card :deep(.error) {
  margin: 16px 0 0;
  font-size: 14px;
  color: var(--danger);
}
</style>
