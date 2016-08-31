function hi(callback){
  setTimeout(callback,1000)
}

console.log(hi(function(){
  return 5
}))
