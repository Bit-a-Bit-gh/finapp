import localforage from 'localforage'

export default {
  async initChart ({ rootState, commit }) {
    const localPeriods = await localforage.getItem('next.chart.periods')
    let showedGroups, showedPeriods

    for (const periodName in localPeriods) {
      Number.isInteger(localPeriods[periodName].showedGroups)
        ? showedGroups = localPeriods[periodName].showedGroups
        : showedGroups = rootState.chart.periods[periodName].showedGroups
      if (!showedGroups || showedGroups <= 0) { showedGroups = 1 }

      Number.isInteger(localPeriods[periodName].showedPeriods)
        ? showedPeriods = localPeriods[periodName].showedPeriods
        : showedPeriods = rootState.chart.periods[periodName].showedPeriods
      if (!showedGroups || showedPeriods <= 0) { showedPeriods = 1 }

      const periodValues = {
        ...localPeriods[periodName],
        showedGroups,
        showedPeriods
      }

      commit('chart/setPeriodValues', { periodName, values: periodValues }, { root: true })
    }
  }
}
