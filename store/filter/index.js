import dayjs from 'dayjs'

import actions from './actions'
import getters from './getters'
import mutations from './mutations'

const state = () => ({
  categoryId: null,
  walletId: null,
  date: dayjs().valueOf(),
  period: 'month'
})

export default {
  state,
  actions,
  getters,
  mutations
}
