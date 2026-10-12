export function addNews(state, kind, text, extra = {}) {
  state.news.unshift({ date: state.date, kind, text, ...extra });
  if (state.news.length > 150) state.news.length = 150;
}
