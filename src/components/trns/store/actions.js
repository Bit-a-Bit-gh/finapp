import localforage from 'localforage'
import moment from 'moment'

import { db } from '@/firebase'
import {
  removeTrnToAddLaterLocal,
  saveTrnToAddLaterLocal,
  saveTrnToDeleteLaterLocal,
  removeTrnToDeleteLaterLocal
} from './helpers'

export default {
  // create new trn and save it to offline
  addTrn ({ commit, rootState }, { id, values }) {
    const uid = rootState.user.user.uid
    const trns = rootState.trns.items
    let isTrnSavedOnline = false
    const formatedTrnValues = {
      amount: values.amount,
      categoryId: values.categoryId,
      date: moment(values.date).valueOf(),
      description: values.description || null,
      edited: moment().valueOf(),
      groups: values.groups || null,
      type: Number(values.amountType) || 0,
      walletId: values.walletId
    }

    localforage.setItem('next.trns', { ...trns, [id]: formatedTrnValues })
    commit('setTrns', Object.freeze({ ...trns, [id]: formatedTrnValues }))

    db.ref(`users/${uid}/trns/${id}`)
      .set(formatedTrnValues)
      .then(() => {
        isTrnSavedOnline = true
        removeTrnToAddLaterLocal(id)
      })

    setTimeout(() => {
      if (!isTrnSavedOnline) saveTrnToAddLaterLocal({ id, values })
    }, 100)

    commit('setTrnFormValues', { trnId: null, description: null })
  },

  // delete
  deleteTrn ({ commit, rootState }, id) {
    const uid = rootState.user.user.uid
    const trns = { ...rootState.trns.items }

    delete trns[id]
    commit('setTrns', Object.freeze(trns))
    localforage.setItem('next.trns', trns)
    saveTrnToDeleteLaterLocal(id)

    db.ref(`users/${uid}/trns/${id}`)
      .remove()
      .then(() => removeTrnToDeleteLaterLocal(id))
  },

  async deleteTrnsByIds ({ rootState }, trnsIds) {
    const uid = rootState.user.user.uid
    const trnsForDelete = {}
    for (const trnId of trnsIds) {
      trnsForDelete[trnId] = null
    }

    await db.ref(`users/${uid}/trns`)
      .update(trnsForDelete)
      .then(() => console.log('trns deleted'))
  },

  // init
  async initTrns ({ rootState, dispatch, commit }) {
    const uid = rootState.user.user.uid

    await db.ref(`users/${uid}/trns`).on('value', snapshot => {
      const items = Object.freeze(snapshot.val())

      for (const trnId of Object.keys(items)) {
        if (!items[trnId].walletId || items[trnId].accountId) {
          commit('setAppStatus', 'loading')
          const trn = items[trnId]
          console.log(trnId)
          db.ref(`users/${uid}/trns/${trnId}`)
            .set({
              amount: trn.amount,
              categoryId: trn.categoryId,
              date: Number(trn.date),
              description: trn.description || null,
              edited: moment().valueOf(),
              groups: trn.groups || null,
              type: Number(trn.type),
              walletId: trn.accountId || trn.walletId
            })
        }
      }
      commit('setAppStatus', 'ready')
      dispatch('setTrns', items)
    }, e => console.error(e))
  },

  setTrns ({ commit }, items) {
    commit('setTrns', items)
    localforage.setItem('next.trns', items)
  },

  unsubcribeTrns ({ rootState }) {
    const uid = rootState.user.user.uid
    db.ref(`users/${uid}/trns`).off()
  },

  async initOfflineTrns ({ dispatch }) {
    db.ref('.info/connected').on('value', async snap => {
      const isConnected = snap.val()
      if (isConnected) {
        // add
        const trnsOfflineUpdate = await localforage.getItem('next.trns.offline.update') || {}
        for (const trnId in trnsOfflineUpdate) {
          if (trnsOfflineUpdate[trnId] && trnsOfflineUpdate[trnId].amount) {
            dispatch('addTrn', {
              id: trnId,
              values: trnsOfflineUpdate[trnId]
            })
          }
        }
        // delete
        const trnsOfflineDelete = await localforage.getItem('next.trns.offline.delete') || []
        for (const trnId of trnsOfflineDelete) {
          dispatch('deleteTrn', trnId)
        }
      }
    })
  }
}
