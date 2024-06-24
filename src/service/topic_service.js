
import { AxiosInstancePrivate } from "./AxiosInstance";
import { api } from "./apiUrls";

const axios = AxiosInstancePrivate();

export async function getTodaysList(){
     return await axios.get(api.todaysList)
}

export async function getAllList(){
    return await axios.get(api.allTopics)
}
export async function getTopic(id){
    return await axios.get(api.topic(id))
}
export async function deleteTopic(id){
    return await axios.delete(api.topic(id))
}
export async function addTopic(id){
    return await axios.post(api.topic(id))
}
export async function updateTopic(id){
    return await axios.put(api.topic(id))
}
export async function reviseTopic(id){
    return await axios.patch(api.topic(id))
}