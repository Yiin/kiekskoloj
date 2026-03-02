import { defineStore } from "pinia"
import { ref } from "vue"
import type { Group, GroupMember } from "@kiekskoloj/shared"
import { useApi } from "@/composables/useApi"

export const useGroupsStore = defineStore("groups", () => {
  const groups = ref<Group[]>([])
  const currentGroup = ref<Group | null>(null)
  const members = ref<GroupMember[]>([])
  const api = useApi()

  async function fetchGroups() {
    const res = await api.get<{ groups: Group[] }>("/groups")
    groups.value = res.groups
  }

  async function createGroup(data: { name: string; memberName: string; currency: string; color?: string }) {
    const res = await api.post<{ group: Group }>("/groups", data)
    groups.value.push(res.group)
    return res.group
  }

  async function fetchGroup(id: string) {
    const res = await api.get<{ group: Group & { members: GroupMember[] } }>(`/groups/${id}`)
    currentGroup.value = res.group
    members.value = res.group.members
    return res.group
  }

  async function updateGroup(id: string, data: Partial<Group>) {
    const res = await api.put<{ group: Group }>(`/groups/${id}`, data)
    currentGroup.value = res.group
    const idx = groups.value.findIndex((g) => g.id === id)
    if (idx !== -1) {
      groups.value[idx] = { ...groups.value[idx], ...res.group }
    }
    return res.group
  }

  async function deleteGroup(id: string) {
    await api.del(`/groups/${id}`)
    groups.value = groups.value.filter((g) => g.id !== id)
    if (currentGroup.value?.id === id) {
      currentGroup.value = null
      members.value = []
    }
  }

  async function addMember(groupId: string, data: { name: string; weight?: number }) {
    const res = await api.post<{ member: GroupMember }>(`/groups/${groupId}/members`, data)
    members.value.push(res.member)
    return res.member
  }

  async function updateMember(groupId: string, memberId: string, data: Partial<GroupMember>) {
    const res = await api.put<{ member: GroupMember }>(`/groups/${groupId}/members/${memberId}`, data)
    const idx = members.value.findIndex((m) => m.id === memberId)
    if (idx !== -1) {
      members.value[idx] = res.member
    }
    return res.member
  }

  async function removeMember(groupId: string, memberId: string) {
    await api.del(`/groups/${groupId}/members/${memberId}`)
    members.value = members.value.filter((m) => m.id !== memberId)
  }

  async function joinGroup(inviteCode: string, name: string) {
    const res = await api.post<{ group: Group; member: GroupMember }>(`/groups/join/${inviteCode}`, { name })
    return res.group
  }

  return {
    groups,
    currentGroup,
    members,
    fetchGroups,
    createGroup,
    fetchGroup,
    updateGroup,
    deleteGroup,
    addMember,
    updateMember,
    removeMember,
    joinGroup,
  }
})
