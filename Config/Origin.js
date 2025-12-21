const allowed=['*','http://localhost:5173']

const  opt={
    origin:(origin,cb)=>{
        if(allowed.includes(origin)||!origin){
            cb(null,true)
        }else{
            cb(new Error("Not allowed by cors"))
        }
    },
    credentials:true,
    // optionsSuccessStatus:true
}
      
module.exports=opt