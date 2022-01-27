export const convertArrayToTable = (data: any[]) => {
    const keys = Object.keys(data[0]);
    const structured = [keys];
    data.forEach(t => structured.push(Object.values(t)));
    return structured;
}