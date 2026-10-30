; ModuleID = 'prototype/fixtures/fold_recurrence.cpp'
source_filename = "prototype/fixtures/fold_recurrence.cpp"
target datalayout = "e-m:e-p270:32:32-p271:32:32-p272:64:64-i64:64-i128:128-f80:128-n8:16:32:64-S128"
target triple = "x86_64-pc-linux-gnu"

%struct.Box = type { %"class.std::vector", %struct.Bucket, ptr }
%"class.std::vector" = type { %"struct.std::_Vector_base" }
%"struct.std::_Vector_base" = type { %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl" }
%"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl" = type { %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data" }
%"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data" = type { ptr, ptr, ptr }
%struct.Bucket = type { i32, i32 }

@.str = private unnamed_addr constant [49 x i8] c"cannot create std::vector larger than max_size()\00", align 1, !dbg !0

; Function Attrs: mustprogress nofree noinline norecurse nosync nounwind willreturn memory(argmem: readwrite) uwtable
define dso_local void @_Z5carry3Box(ptr dead_on_unwind noalias nofree writable writeonly sret(%struct.Box) align 8 captures(none) initializes((0, 40)) %0, ptr nofree noundef align 8 captures(none) %1) local_unnamed_addr #0 !dbg !651 {
    #dbg_value(ptr %1, !655, !DIExpression(DW_OP_deref), !656)
  %3 = getelementptr inbounds nuw i8, ptr %1, i64 24, !dbg !657
  %4 = load i32, ptr %3, align 8, !dbg !658, !tbaa !659
  %5 = add nsw i32 %4, 1, !dbg !668
  store i32 %5, ptr %3, align 8, !dbg !669, !tbaa !659
    #dbg_value(ptr %0, !670, !DIExpression(), !680)
    #dbg_value(ptr %1, !678, !DIExpression(), !680)
    #dbg_value(ptr %0, !682, !DIExpression(), !687)
    #dbg_value(ptr %1, !685, !DIExpression(), !687)
    #dbg_value(ptr %0, !689, !DIExpression(), !694)
    #dbg_value(ptr %1, !692, !DIExpression(), !694)
    #dbg_value(ptr %0, !696, !DIExpression(), !701)
    #dbg_value(ptr %1, !699, !DIExpression(), !701)
    #dbg_value(ptr %0, !703, !DIExpression(), !708)
    #dbg_value(ptr %1, !706, !DIExpression(), !708)
  %6 = load <2 x ptr>, ptr %1, align 8, !dbg !710, !tbaa !711
  store <2 x ptr> %6, ptr %0, align 8, !dbg !712, !tbaa !711
  %7 = getelementptr inbounds nuw i8, ptr %0, i64 16, !dbg !713
  %8 = getelementptr inbounds nuw i8, ptr %1, i64 16, !dbg !714
  %9 = load ptr, ptr %8, align 8, !dbg !715, !tbaa !716
  store ptr %9, ptr %7, align 8, !dbg !717, !tbaa !716
  tail call void @llvm.memset.p0.i64(ptr noundef nonnull align 8 dereferenceable(40) %1, i8 0, i64 24, i1 false), !dbg !718
  %10 = getelementptr inbounds nuw i8, ptr %0, i64 24, !dbg !720
  tail call void @llvm.memcpy.p0.p0.i64(ptr noundef nonnull align 8 dereferenceable(16) %10, ptr noundef nonnull align 8 dereferenceable(16) %3, i64 16, i1 false), !dbg !721
  ret void, !dbg !722
}

; Function Attrs: mustprogress uwtable
define dso_local noundef i32 @_Z7advance3Envi(ptr nofree noundef align 8 captures(none) %0, i32 noundef %1) local_unnamed_addr #1 personality ptr @__gxx_personality_v0 !dbg !723 {
    #dbg_value(ptr poison, !738, !DIExpression(), !744)
    #dbg_value(ptr poison, !748, !DIExpression(), !784)
    #dbg_value(ptr poison, !755, !DIExpression(), !785)
    #dbg_value(ptr poison, !762, !DIExpression(), !786)
    #dbg_value(ptr poison, !769, !DIExpression(), !787)
    #dbg_value(ptr poison, !774, !DIExpression(), !788)
    #dbg_value(ptr poison, !782, !DIExpression(), !789)
    #dbg_value(ptr poison, !738, !DIExpression(), !790)
    #dbg_value(ptr poison, !748, !DIExpression(), !798)
    #dbg_value(ptr poison, !755, !DIExpression(), !799)
    #dbg_value(ptr poison, !762, !DIExpression(), !800)
    #dbg_value(ptr poison, !769, !DIExpression(), !801)
    #dbg_value(ptr poison, !774, !DIExpression(), !802)
    #dbg_value(ptr poison, !782, !DIExpression(), !803)
    #dbg_value(ptr poison, !804, !DIExpression(), !808)
    #dbg_value(ptr poison, !813, !DIExpression(), !825)
    #dbg_value(ptr poison, !823, !DIExpression(), !826)
    #dbg_value(ptr poison, !703, !DIExpression(), !827)
    #dbg_value(ptr poison, !696, !DIExpression(), !832)
    #dbg_value(ptr poison, !689, !DIExpression(), !833)
    #dbg_value(ptr poison, !682, !DIExpression(), !834)
    #dbg_value(ptr poison, !738, !DIExpression(), !835)
    #dbg_value(ptr poison, !748, !DIExpression(), !842)
    #dbg_value(ptr poison, !755, !DIExpression(), !843)
    #dbg_value(ptr poison, !762, !DIExpression(), !844)
    #dbg_value(ptr poison, !769, !DIExpression(), !845)
    #dbg_value(ptr poison, !774, !DIExpression(), !846)
    #dbg_value(ptr poison, !738, !DIExpression(), !847)
    #dbg_value(ptr poison, !748, !DIExpression(), !854)
    #dbg_value(ptr poison, !755, !DIExpression(), !855)
    #dbg_value(ptr poison, !762, !DIExpression(), !856)
    #dbg_value(ptr poison, !769, !DIExpression(), !857)
    #dbg_value(ptr poison, !774, !DIExpression(), !858)
    #dbg_value(ptr poison, !859, !DIExpression(), !864)
    #dbg_value(ptr poison, !868, !DIExpression(), !899)
    #dbg_value(ptr poison, !873, !DIExpression(), !900)
    #dbg_value(ptr poison, !901, !DIExpression(), !912)
    #dbg_value(ptr poison, !916, !DIExpression(), !920)
    #dbg_value(ptr poison, !878, !DIExpression(), !921)
    #dbg_value(ptr poison, !883, !DIExpression(), !922)
    #dbg_value(ptr poison, !889, !DIExpression(), !923)
    #dbg_value(ptr poison, !895, !DIExpression(), !924)
    #dbg_value(ptr poison, !891, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !923)
    #dbg_value(ptr poison, !925, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !929)
    #dbg_value(ptr poison, !897, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !924)
    #dbg_value(ptr poison, !738, !DIExpression(), !931)
    #dbg_value(ptr poison, !748, !DIExpression(), !939)
    #dbg_value(ptr poison, !755, !DIExpression(), !940)
    #dbg_value(ptr poison, !762, !DIExpression(), !941)
    #dbg_value(ptr poison, !769, !DIExpression(), !942)
    #dbg_value(ptr poison, !774, !DIExpression(), !943)
    #dbg_value(ptr poison, !782, !DIExpression(), !944)
    #dbg_value(ptr poison, !706, !DIExpression(), !945)
    #dbg_value(ptr poison, !699, !DIExpression(), !951)
    #dbg_value(ptr poison, !692, !DIExpression(), !952)
    #dbg_value(ptr poison, !685, !DIExpression(), !953)
    #dbg_value(ptr poison, !678, !DIExpression(), !954)
    #dbg_value(ptr poison, !703, !DIExpression(), !955)
    #dbg_value(ptr poison, !696, !DIExpression(), !975)
    #dbg_value(ptr poison, !689, !DIExpression(), !976)
    #dbg_value(ptr poison, !682, !DIExpression(), !977)
    #dbg_value(ptr poison, !670, !DIExpression(), !978)
    #dbg_value(ptr poison, !738, !DIExpression(), !979)
    #dbg_value(ptr poison, !748, !DIExpression(), !987)
    #dbg_value(ptr poison, !755, !DIExpression(), !988)
    #dbg_value(ptr poison, !762, !DIExpression(), !989)
    #dbg_value(ptr poison, !769, !DIExpression(), !990)
    #dbg_value(ptr poison, !774, !DIExpression(), !991)
    #dbg_value(ptr poison, !782, !DIExpression(), !992)
    #dbg_value(ptr poison, !738, !DIExpression(), !993)
    #dbg_value(ptr poison, !748, !DIExpression(), !1001)
    #dbg_value(ptr poison, !755, !DIExpression(), !1002)
    #dbg_value(ptr poison, !762, !DIExpression(), !1003)
    #dbg_value(ptr poison, !769, !DIExpression(), !1004)
    #dbg_value(ptr poison, !774, !DIExpression(), !1005)
    #dbg_value(ptr poison, !782, !DIExpression(), !1006)
    #dbg_value(ptr poison, !706, !DIExpression(), !955)
    #dbg_value(ptr poison, !699, !DIExpression(), !975)
    #dbg_value(ptr poison, !692, !DIExpression(), !976)
    #dbg_value(ptr poison, !685, !DIExpression(), !977)
    #dbg_value(ptr poison, !678, !DIExpression(), !978)
    #dbg_value(ptr poison, !706, !DIExpression(), !1007)
    #dbg_value(ptr poison, !699, !DIExpression(), !1015)
    #dbg_value(ptr poison, !692, !DIExpression(), !1016)
    #dbg_value(ptr poison, !685, !DIExpression(), !1017)
    #dbg_value(ptr poison, !678, !DIExpression(), !1018)
    #dbg_value(ptr poison, !1019, !DIExpression(), !1029)
    #dbg_value(ptr poison, !859, !DIExpression(), !1032)
    #dbg_value(ptr poison, !868, !DIExpression(), !1039)
    #dbg_value(ptr poison, !873, !DIExpression(), !1040)
    #dbg_value(ptr poison, !878, !DIExpression(), !1041)
    #dbg_value(ptr poison, !883, !DIExpression(), !1042)
    #dbg_value(ptr poison, !889, !DIExpression(), !1043)
    #dbg_value(ptr poison, !812, !DIExpression(), !825)
    #dbg_value(ptr poison, !822, !DIExpression(), !826)
  %3 = alloca %struct.Box, align 8, !DIAssignID !1044
    #dbg_assign(i1 poison, !736, !DIExpression(), !1044, ptr %3, !DIExpression(), !1045)
  %4 = alloca %struct.Box, align 8
    #dbg_value(ptr %0, !731, !DIExpression(DW_OP_deref), !1045)
    #dbg_value(i32 %1, !732, !DIExpression(), !1045)
  %5 = getelementptr inbounds nuw i8, ptr %0, i64 8, !dbg !1046
    #dbg_value(ptr undef, !682, !DIExpression(), !834)
    #dbg_value(ptr %5, !685, !DIExpression(), !834)
    #dbg_value(ptr undef, !689, !DIExpression(), !833)
    #dbg_value(ptr %5, !692, !DIExpression(), !833)
    #dbg_value(ptr undef, !696, !DIExpression(), !832)
    #dbg_value(ptr %5, !699, !DIExpression(), !832)
    #dbg_value(ptr undef, !703, !DIExpression(), !827)
    #dbg_value(ptr %5, !706, !DIExpression(), !827)
  %6 = load ptr, ptr %5, align 8, !dbg !1047, !tbaa !1048
    #dbg_value(ptr %6, !733, !DIExpression(DW_OP_LLVM_fragment, 0, 64), !1045)
  %7 = getelementptr inbounds nuw i8, ptr %0, i64 16, !dbg !1049
  %8 = load ptr, ptr %7, align 8, !dbg !1050, !tbaa !1051
    #dbg_value(ptr %8, !733, !DIExpression(DW_OP_LLVM_fragment, 64, 64), !1045)
  %9 = getelementptr inbounds nuw i8, ptr %0, i64 24, !dbg !1052
  %10 = load ptr, ptr %9, align 8, !dbg !1053, !tbaa !716
    #dbg_value(ptr %10, !733, !DIExpression(DW_OP_LLVM_fragment, 128, 64), !1045)
  tail call void @llvm.memset.p0.i64(ptr noundef nonnull align 8 dereferenceable(24) %5, i8 0, i64 24, i1 false), !dbg !1054
  %11 = getelementptr inbounds nuw i8, ptr %0, i64 32, !dbg !1055
  %12 = load i64, ptr %11, align 8, !dbg !1056
    #dbg_value(i64 %12, !733, !DIExpression(DW_OP_LLVM_fragment, 192, 64), !1045)
    #dbg_value(ptr null, !733, !DIExpression(DW_OP_LLVM_fragment, 256, 64), !1045)
  %13 = sext i32 %1 to i64, !dbg !1057
    #dbg_value(ptr undef, !895, !DIExpression(), !924)
    #dbg_value(i64 %13, !896, !DIExpression(), !924)
    #dbg_value(ptr undef, !897, !DIExpression(), !924)
    #dbg_value(i64 %13, !928, !DIExpression(), !929)
    #dbg_value(ptr undef, !925, !DIExpression(), !929)
  %14 = icmp slt i32 %1, 0, !dbg !1058
  br i1 %14, label %15, label %17, !dbg !1060

15:                                               ; preds = %2
  invoke void @_ZSt20__throw_length_errorPKc(ptr noundef nonnull @.str) #7
          to label %16 unwind label %145, !dbg !1061

16:                                               ; preds = %15
  unreachable, !dbg !1061

17:                                               ; preds = %2
    #dbg_value(ptr undef, !889, !DIExpression(), !923)
    #dbg_value(i64 %13, !890, !DIExpression(), !923)
    #dbg_value(ptr undef, !891, !DIExpression(), !923)
    #dbg_value(ptr null, !734, !DIExpression(DW_OP_LLVM_fragment, 0, 64), !1045)
    #dbg_value(ptr null, !734, !DIExpression(DW_OP_LLVM_fragment, 64, 64), !1045)
    #dbg_value(ptr null, !734, !DIExpression(DW_OP_LLVM_fragment, 128, 64), !1045)
    #dbg_value(ptr undef, !883, !DIExpression(), !922)
    #dbg_value(i64 %13, !884, !DIExpression(), !922)
    #dbg_value(ptr undef, !878, !DIExpression(), !921)
    #dbg_value(i64 %13, !879, !DIExpression(), !921)
  %18 = icmp eq i32 %1, 0, !dbg !1062
  br i1 %18, label %67, label %19, !dbg !1063

19:                                               ; preds = %17
    #dbg_value(ptr undef, !873, !DIExpression(), !900)
    #dbg_value(i64 %13, !874, !DIExpression(), !900)
    #dbg_value(ptr undef, !868, !DIExpression(), !899)
    #dbg_value(i64 %13, !869, !DIExpression(), !899)
    #dbg_value(ptr undef, !859, !DIExpression(), !864)
    #dbg_value(i64 %13, !862, !DIExpression(), !864)
    #dbg_value(ptr null, !863, !DIExpression(), !864)
  %20 = shl nuw nsw i64 %13, 2, !dbg !1064
  %21 = invoke noalias noundef nonnull ptr @_Znwm(i64 noundef %20) #8
          to label %22 unwind label %145, !dbg !1065

22:                                               ; preds = %19
    #dbg_value(ptr %21, !734, !DIExpression(DW_OP_LLVM_fragment, 0, 64), !1045)
  %23 = ptrtoint ptr %21 to i64, !dbg !1066
  %24 = getelementptr inbounds nuw [4 x i8], ptr %21, i64 %13, !dbg !1066
    #dbg_value(ptr %24, !734, !DIExpression(DW_OP_LLVM_fragment, 128, 64), !1045)
    #dbg_value(ptr undef, !916, !DIExpression(), !920)
    #dbg_value(i64 %13, !917, !DIExpression(), !920)
    #dbg_value(ptr %21, !907, !DIExpression(), !912)
    #dbg_value(i64 %13, !908, !DIExpression(), !912)
    #dbg_value(ptr undef, !901, !DIExpression(), !912)
    #dbg_value(ptr %21, !1067, !DIExpression(), !1075)
    #dbg_value(i64 %13, !1072, !DIExpression(), !1075)
    #dbg_value(i8 1, !1073, !DIExpression(), !1075)
    #dbg_value(ptr %21, !1077, !DIExpression(), !1095)
    #dbg_value(i64 %13, !1084, !DIExpression(), !1095)
    #dbg_value(ptr %21, !1085, !DIExpression(), !1097)
    #dbg_value(ptr %21, !1098, !DIExpression(), !1106)
  store i32 0, ptr %21, align 4, !dbg !1108, !tbaa !1109
  %25 = getelementptr i8, ptr %21, i64 4, !dbg !1110
    #dbg_value(ptr %25, !1077, !DIExpression(), !1095)
  %26 = add nsw i64 %13, -1, !dbg !1111
    #dbg_value(ptr %25, !1112, !DIExpression(), !1122)
    #dbg_value(i64 %26, !1118, !DIExpression(), !1122)
    #dbg_value(ptr %21, !1119, !DIExpression(), !1122)
    #dbg_value(ptr %25, !1124, !DIExpression(), !1144)
    #dbg_value(i64 %26, !1139, !DIExpression(), !1144)
    #dbg_value(ptr %21, !1140, !DIExpression(), !1144)
  %27 = icmp eq i64 %26, 0, !dbg !1146
  br i1 %27, label %31, label %28, !dbg !1148

28:                                               ; preds = %22
  %29 = shl nuw nsw i64 %26, 2, !dbg !1149
    #dbg_value(ptr %25, !1150, !DIExpression(), !1159)
    #dbg_value(ptr %30, !1155, !DIExpression(), !1159)
    #dbg_value(ptr poison, !1156, !DIExpression(), !1159)
    #dbg_value(ptr %25, !1161, !DIExpression(), !1176)
    #dbg_value(ptr %30, !1172, !DIExpression(), !1176)
    #dbg_value(ptr poison, !1173, !DIExpression(), !1176)
    #dbg_value(i32 0, !1174, !DIExpression(), !1176)
  tail call void @llvm.memset.p0.i64(ptr align 4 %25, i8 0, i64 %29, i1 false), !dbg !1178, !tbaa !1109
    #dbg_value(ptr poison, !1161, !DIExpression(), !1176)
  %30 = getelementptr inbounds nuw i8, ptr %25, i64 %29, !dbg !1149
    #dbg_value(ptr %21, !734, !DIExpression(DW_OP_LLVM_fragment, 0, 64), !1045)
    #dbg_value(ptr %24, !734, !DIExpression(DW_OP_LLVM_fragment, 128, 64), !1045)
    #dbg_value(ptr %30, !1077, !DIExpression(), !1095)
    #dbg_value(ptr %30, !734, !DIExpression(DW_OP_LLVM_fragment, 64, 64), !1045)
    #dbg_value(ptr poison, !1181, !DIExpression(), !1185)
    #dbg_value(ptr %21, !1193, !DIExpression(), !1199)
    #dbg_value(ptr %30, !1194, !DIExpression(), !1199)
    #dbg_value(i32 0, !1195, !DIExpression(), !1199)
    #dbg_value(ptr undef, !1200, !DIExpression(), !1207)
    #dbg_value(ptr undef, !1206, !DIExpression(), !1207)
  br label %31, !dbg !1209

31:                                               ; preds = %28, %22
  %32 = phi ptr [ %30, %28 ], [ %25, %22 ]
  %33 = ptrtoint ptr %32 to i64, !dbg !1210
  %34 = add i64 %33, -4, !dbg !1210
  %35 = sub i64 %34, %23, !dbg !1210
  %36 = lshr i64 %35, 2, !dbg !1210
  %37 = add nuw nsw i64 %36, 1, !dbg !1210
  %38 = icmp ult i64 %35, 28, !dbg !1210
  br i1 %38, label %56, label %39, !dbg !1210

39:                                               ; preds = %31
  %40 = and i64 %37, 9223372036854775800
  %41 = trunc i64 %40 to i32
  %42 = shl i64 %40, 2
  %43 = getelementptr i8, ptr %21, i64 %42
  br label %44, !dbg !1210

44:                                               ; preds = %44, %39
  %45 = phi i64 [ 0, %39 ], [ %51, %44 ]
  %46 = phi <4 x i32> [ <i32 0, i32 1, i32 2, i32 3>, %39 ], [ %52, %44 ]
  %47 = add nuw nsw <4 x i32> %46, splat (i32 4)
  %48 = shl i64 %45, 2
  %49 = getelementptr i8, ptr %21, i64 %48
  %50 = getelementptr i8, ptr %49, i64 16, !dbg !1211
  store <4 x i32> %46, ptr %49, align 4, !dbg !1211, !tbaa !1109
  store <4 x i32> %47, ptr %50, align 4, !dbg !1211, !tbaa !1109
  %51 = add nuw i64 %45, 8
  %52 = add nuw nsw <4 x i32> %46, splat (i32 8)
  %53 = icmp eq i64 %51, %40, !dbg !1213
  br i1 %53, label %54, label %44, !dbg !1213, !llvm.loop !1214

54:                                               ; preds = %44
  %55 = icmp eq i64 %37, %40, !dbg !1213
  br i1 %55, label %65, label %56, !dbg !1213

56:                                               ; preds = %31, %54
  %57 = phi i32 [ 0, %31 ], [ %41, %54 ]
  %58 = phi ptr [ %21, %31 ], [ %43, %54 ]
  br label %59, !dbg !1213

59:                                               ; preds = %56, %59
  %60 = phi i32 [ %62, %59 ], [ %57, %56 ]
  %61 = phi ptr [ %63, %59 ], [ %58, %56 ]
    #dbg_value(i32 %60, !1195, !DIExpression(), !1199)
    #dbg_value(ptr %61, !1193, !DIExpression(), !1199)
  store i32 %60, ptr %61, align 4, !dbg !1211, !tbaa !1109
  %62 = add nuw nsw i32 %60, 1, !dbg !1218
    #dbg_value(i32 %62, !1195, !DIExpression(), !1199)
    #dbg_value(ptr undef, !1181, !DIExpression(), !1185)
  %63 = getelementptr inbounds nuw i8, ptr %61, i64 4, !dbg !1219
    #dbg_value(ptr %63, !1193, !DIExpression(), !1199)
    #dbg_value(ptr undef, !1200, !DIExpression(), !1207)
    #dbg_value(ptr undef, !1206, !DIExpression(), !1207)
  %64 = icmp eq ptr %63, %32, !dbg !1220
  br i1 %64, label %65, label %59, !dbg !1213, !llvm.loop !1221

65:                                               ; preds = %59, %54
  %66 = ptrtoint ptr %24 to i64, !dbg !1222
  br label %67, !dbg !1223

67:                                               ; preds = %65, %17
  %68 = phi ptr [ null, %17 ], [ %32, %65 ]
  %69 = phi ptr [ null, %17 ], [ %21, %65 ]
  %70 = phi i64 [ 0, %17 ], [ %66, %65 ]
    #dbg_value(ptr undef, !822, !DIExpression(), !826)
    #dbg_value(ptr undef, !823, !DIExpression(), !826)
    #dbg_value(ptr poison, !891, !DIExpression(DW_OP_LLVM_fragment, 0, 8), !1043)
    #dbg_value(ptr undef, !812, !DIExpression(), !825)
    #dbg_value(ptr undef, !813, !DIExpression(), !825)
    #dbg_value(ptr undef, !804, !DIExpression(), !808)
  %71 = ptrtoint ptr %8 to i64, !dbg !1223
  %72 = ptrtoint ptr %6 to i64, !dbg !1223
  %73 = sub i64 %71, %72, !dbg !1223
    #dbg_value(ptr undef, !889, !DIExpression(), !1043)
    #dbg_value(i64 %73, !890, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !1043)
    #dbg_value(ptr undef, !891, !DIExpression(), !1043)
    #dbg_value(ptr undef, !883, !DIExpression(), !1042)
    #dbg_value(i64 %73, !884, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !1042)
    #dbg_value(ptr undef, !878, !DIExpression(), !1041)
    #dbg_value(i64 %73, !879, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !1041)
  %74 = icmp eq ptr %8, %6, !dbg !1224
  br i1 %74, label %75, label %77, !dbg !1225

75:                                               ; preds = %67
  %76 = getelementptr inbounds i8, ptr null, i64 %73, !dbg !1226
    #dbg_value(ptr %6, !1024, !DIExpression(), !1029)
    #dbg_value(ptr %8, !1025, !DIExpression(), !1029)
    #dbg_value(ptr null, !1026, !DIExpression(), !1029)
    #dbg_value(ptr undef, !1019, !DIExpression(), !1029)
    #dbg_value(ptr %6, !1227, !DIExpression(), !1237)
    #dbg_value(ptr %8, !1232, !DIExpression(), !1237)
    #dbg_value(ptr null, !1233, !DIExpression(), !1237)
    #dbg_value(i8 1, !1234, !DIExpression(), !1237)
    #dbg_value(i8 1, !1235, !DIExpression(), !1237)
    #dbg_value(ptr %6, !1239, !DIExpression(), !1248)
    #dbg_value(ptr %8, !1246, !DIExpression(), !1248)
    #dbg_value(ptr null, !1247, !DIExpression(), !1248)
    #dbg_value(ptr %6, !1250, !DIExpression(), !1257)
    #dbg_value(ptr %8, !1253, !DIExpression(), !1257)
    #dbg_value(ptr null, !1254, !DIExpression(), !1257)
    #dbg_value(ptr %6, !1259, !DIExpression(), !1266)
    #dbg_value(ptr %8, !1262, !DIExpression(), !1266)
    #dbg_value(ptr null, !1263, !DIExpression(), !1266)
    #dbg_value(ptr %6, !1268, !DIExpression(), !1277)
    #dbg_value(ptr %8, !1273, !DIExpression(), !1277)
    #dbg_value(ptr null, !1274, !DIExpression(), !1277)
    #dbg_value(ptr %6, !1279, !DIExpression(), !1284)
    #dbg_value(ptr %8, !1282, !DIExpression(), !1284)
    #dbg_value(ptr null, !1283, !DIExpression(), !1284)
    #dbg_value(ptr %6, !1286, !DIExpression(), !1301)
    #dbg_value(ptr %8, !1297, !DIExpression(), !1301)
    #dbg_value(ptr null, !1298, !DIExpression(), !1301)
    #dbg_value(i64 %73, !1299, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !1301)
  br label %91, !dbg !1303

77:                                               ; preds = %67
    #dbg_value(i64 %73, !890, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !1043)
    #dbg_value(i64 %73, !884, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !1042)
    #dbg_value(i64 %73, !879, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !1041)
    #dbg_value(ptr undef, !873, !DIExpression(), !1040)
    #dbg_value(i64 %73, !874, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !1040)
    #dbg_value(ptr undef, !868, !DIExpression(), !1039)
    #dbg_value(i64 %73, !869, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !1039)
    #dbg_value(ptr undef, !859, !DIExpression(), !1032)
    #dbg_value(i64 %73, !862, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !1032)
    #dbg_value(ptr null, !863, !DIExpression(), !1032)
  %78 = icmp ugt i64 %73, 9223372036854775804, !dbg !1306
  br i1 %78, label %79, label %81, !dbg !1308, !prof !1309

79:                                               ; preds = %77
  invoke void @_ZSt28__throw_bad_array_new_lengthv() #7
          to label %80 unwind label %147, !dbg !1310

80:                                               ; preds = %79
  unreachable, !dbg !1310

81:                                               ; preds = %77
  %82 = invoke noalias noundef nonnull ptr @_Znwm(i64 noundef %73) #8
          to label %83 unwind label %147, !dbg !1313

83:                                               ; preds = %81
  %84 = getelementptr inbounds nuw i8, ptr %82, i64 %73, !dbg !1314
    #dbg_value(ptr %6, !1024, !DIExpression(), !1029)
    #dbg_value(ptr %8, !1025, !DIExpression(), !1029)
    #dbg_value(ptr %82, !1026, !DIExpression(), !1029)
    #dbg_value(ptr undef, !1019, !DIExpression(), !1029)
    #dbg_value(ptr %6, !1227, !DIExpression(), !1237)
    #dbg_value(ptr %8, !1232, !DIExpression(), !1237)
    #dbg_value(ptr %82, !1233, !DIExpression(), !1237)
    #dbg_value(i8 1, !1234, !DIExpression(), !1237)
    #dbg_value(i8 1, !1235, !DIExpression(), !1237)
    #dbg_value(ptr %6, !1239, !DIExpression(), !1248)
    #dbg_value(ptr %8, !1246, !DIExpression(), !1248)
    #dbg_value(ptr %82, !1247, !DIExpression(), !1248)
    #dbg_value(ptr %6, !1250, !DIExpression(), !1257)
    #dbg_value(ptr %8, !1253, !DIExpression(), !1257)
    #dbg_value(ptr %82, !1254, !DIExpression(), !1257)
    #dbg_value(ptr %6, !1259, !DIExpression(), !1266)
    #dbg_value(ptr %8, !1262, !DIExpression(), !1266)
    #dbg_value(ptr %82, !1263, !DIExpression(), !1266)
    #dbg_value(ptr %6, !1268, !DIExpression(), !1277)
    #dbg_value(ptr %8, !1273, !DIExpression(), !1277)
    #dbg_value(ptr %82, !1274, !DIExpression(), !1277)
    #dbg_value(ptr %6, !1279, !DIExpression(), !1284)
    #dbg_value(ptr %8, !1282, !DIExpression(), !1284)
    #dbg_value(ptr %82, !1283, !DIExpression(), !1284)
    #dbg_value(ptr %6, !1286, !DIExpression(), !1301)
    #dbg_value(ptr %8, !1297, !DIExpression(), !1301)
    #dbg_value(ptr %82, !1298, !DIExpression(), !1301)
    #dbg_value(i64 %73, !1299, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !1301)
  %85 = icmp samesign ugt i64 %73, 4, !dbg !1315
  br i1 %85, label %86, label %87, !dbg !1316, !prof !1317

86:                                               ; preds = %83
  tail call void @llvm.memmove.p0.p0.i64(ptr nonnull align 4 %82, ptr align 4 %6, i64 %73, i1 false), !dbg !1318
  br label %91, !dbg !1319

87:                                               ; preds = %83
  %88 = icmp eq i64 %73, 4, !dbg !1320
  br i1 %88, label %89, label %91, !dbg !1321

89:                                               ; preds = %87
    #dbg_value(ptr %82, !1322, !DIExpression(), !1334)
    #dbg_value(ptr %6, !1333, !DIExpression(), !1334)
  %90 = load i32, ptr %6, align 4, !dbg !1336, !tbaa !1109
  store i32 %90, ptr %82, align 4, !dbg !1337, !tbaa !1109
  br label %91, !dbg !1338

91:                                               ; preds = %89, %87, %86, %75
  %92 = phi ptr [ %84, %86 ], [ %84, %87 ], [ %84, %89 ], [ %76, %75 ]
  %93 = phi ptr [ %82, %86 ], [ %82, %87 ], [ %82, %89 ], [ null, %75 ]
  %94 = trunc i64 %12 to i32, !dbg !1339
  %95 = lshr i64 %12, 32, !dbg !1339
  %96 = trunc nuw i64 %95 to i32, !dbg !1339
    #dbg_value(ptr null, !968, !DIExpression(DW_OP_LLVM_fragment, 256, 64), !1340)
    #dbg_value(ptr poison, !1181, !DIExpression(), !1341)
    #dbg_value(ptr poison, !703, !DIExpression(), !1343)
    #dbg_value(ptr poison, !696, !DIExpression(), !1363)
    #dbg_value(ptr poison, !689, !DIExpression(), !1364)
    #dbg_value(ptr poison, !682, !DIExpression(), !1365)
    #dbg_value(ptr poison, !670, !DIExpression(), !1366)
    #dbg_value(ptr poison, !706, !DIExpression(), !1343)
    #dbg_value(ptr poison, !699, !DIExpression(), !1363)
    #dbg_value(ptr poison, !692, !DIExpression(), !1364)
    #dbg_value(ptr poison, !685, !DIExpression(), !1365)
    #dbg_value(ptr poison, !678, !DIExpression(), !1366)
    #dbg_value(ptr poison, !703, !DIExpression(), !1007)
    #dbg_value(ptr poison, !696, !DIExpression(), !1015)
    #dbg_value(ptr poison, !689, !DIExpression(), !1016)
    #dbg_value(ptr poison, !682, !DIExpression(), !1017)
    #dbg_value(ptr poison, !670, !DIExpression(), !1018)
    #dbg_value(ptr %69, !966, !DIExpression(), !1340)
    #dbg_value(ptr %68, !967, !DIExpression(), !1340)
    #dbg_value(ptr undef, !968, !DIExpression(DW_OP_deref), !1340)
    #dbg_value(ptr undef, !1200, !DIExpression(), !1367)
    #dbg_value(ptr undef, !1206, !DIExpression(), !1367)
  br i1 %18, label %110, label %97, !dbg !1369

97:                                               ; preds = %91, %97
  %98 = phi i32 [ %107, %97 ], [ %96, %91 ], !dbg !1370
  %99 = phi i32 [ %106, %97 ], [ %94, %91 ], !dbg !1370
  %100 = phi ptr [ %108, %97 ], [ %69, %91 ]
    #dbg_value(ptr %100, !966, !DIExpression(), !1340)
    #dbg_value(ptr undef, !670, !DIExpression(), !1018)
    #dbg_value(ptr undef, !678, !DIExpression(), !1018)
    #dbg_value(ptr undef, !682, !DIExpression(), !1017)
    #dbg_value(ptr undef, !685, !DIExpression(), !1017)
    #dbg_value(ptr undef, !689, !DIExpression(), !1016)
    #dbg_value(ptr undef, !692, !DIExpression(), !1016)
    #dbg_value(ptr undef, !696, !DIExpression(), !1015)
    #dbg_value(ptr undef, !699, !DIExpression(), !1015)
    #dbg_value(ptr undef, !703, !DIExpression(), !1007)
    #dbg_value(ptr undef, !706, !DIExpression(), !1007)
    #dbg_value(ptr poison, !1358, !DIExpression(DW_OP_LLVM_fragment, 256, 64), !1371)
  %101 = load i32, ptr %100, align 4, !dbg !1372, !tbaa !1109, !noalias !1373
    #dbg_value(ptr poison, !1356, !DIExpression(), !1371)
    #dbg_value(ptr undef, !1358, !DIExpression(DW_OP_deref), !1371)
    #dbg_value(i32 %101, !1359, !DIExpression(), !1371)
    #dbg_value(ptr undef, !1360, !DIExpression(DW_OP_plus_uconst, 24, DW_OP_stack_value), !1371)
  %102 = and i32 %101, 1, !dbg !1376
  %103 = icmp eq i32 %102, 0, !dbg !1376
  %104 = select i1 %103, i32 %99, i32 %98, !dbg !1378
  %105 = add nsw i32 %104, 1, !dbg !1378
  %106 = select i1 %103, i32 %105, i32 %99, !dbg !1378
  %107 = select i1 %103, i32 %98, i32 %105, !dbg !1378
    #dbg_value(ptr undef, !670, !DIExpression(), !1366)
    #dbg_value(ptr undef, !678, !DIExpression(), !1366)
    #dbg_value(ptr undef, !682, !DIExpression(), !1365)
    #dbg_value(ptr undef, !685, !DIExpression(), !1365)
    #dbg_value(ptr undef, !689, !DIExpression(), !1364)
    #dbg_value(ptr undef, !692, !DIExpression(), !1364)
    #dbg_value(ptr undef, !696, !DIExpression(), !1363)
    #dbg_value(ptr undef, !699, !DIExpression(), !1363)
    #dbg_value(ptr undef, !703, !DIExpression(), !1343)
    #dbg_value(ptr undef, !706, !DIExpression(), !1343)
    #dbg_value(ptr undef, !1181, !DIExpression(), !1341)
  %108 = getelementptr inbounds nuw i8, ptr %100, i64 4, !dbg !1379
    #dbg_value(ptr %108, !966, !DIExpression(), !1340)
    #dbg_value(ptr undef, !1200, !DIExpression(), !1367)
    #dbg_value(ptr undef, !1206, !DIExpression(), !1367)
  %109 = icmp eq ptr %108, %68, !dbg !1380
  br i1 %109, label %110, label %97, !dbg !1381, !llvm.loop !1382

110:                                              ; preds = %97, %91
  %111 = phi i32 [ %96, %91 ], [ %107, %97 ], !dbg !1045
  %112 = phi i32 [ %94, %91 ], [ %106, %97 ], !dbg !1045
    #dbg_value(ptr undef, !670, !DIExpression(), !978)
    #dbg_value(ptr undef, !678, !DIExpression(), !978)
    #dbg_value(ptr undef, !682, !DIExpression(), !977)
    #dbg_value(ptr undef, !685, !DIExpression(), !977)
    #dbg_value(ptr undef, !689, !DIExpression(), !976)
    #dbg_value(ptr undef, !692, !DIExpression(), !976)
    #dbg_value(ptr undef, !696, !DIExpression(), !975)
    #dbg_value(ptr undef, !699, !DIExpression(), !975)
    #dbg_value(ptr undef, !703, !DIExpression(), !955)
    #dbg_value(ptr undef, !706, !DIExpression(), !955)
    #dbg_value(ptr %93, !735, !DIExpression(DW_OP_LLVM_fragment, 0, 64), !1045)
    #dbg_value(ptr %92, !735, !DIExpression(DW_OP_LLVM_fragment, 64, 64), !1045)
    #dbg_value(ptr %92, !735, !DIExpression(DW_OP_LLVM_fragment, 128, 64), !1045)
    #dbg_value(i32 %112, !735, !DIExpression(DW_OP_LLVM_fragment, 192, 32), !1045)
    #dbg_value(i32 %111, !735, !DIExpression(DW_OP_LLVM_fragment, 224, 32), !1045)
    #dbg_value(ptr null, !735, !DIExpression(DW_OP_LLVM_fragment, 256, 64), !1045)
    #dbg_value(ptr undef, !782, !DIExpression(), !1006)
    #dbg_value(ptr undef, !774, !DIExpression(), !1005)
    #dbg_value(ptr undef, !769, !DIExpression(), !1004)
    #dbg_value(ptr undef, !762, !DIExpression(), !1003)
    #dbg_value(ptr null, !763, !DIExpression(), !1003)
    #dbg_value(!DIArgList(ptr poison, ptr poison), !764, !DIExpression(DW_OP_LLVM_arg, 0, DW_OP_LLVM_arg, 1, DW_OP_minus, DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !1003)
  call void @llvm.lifetime.start.p0(ptr nonnull %3) #9, !dbg !1385
    #dbg_value(ptr %4, !670, !DIExpression(), !954)
    #dbg_value(ptr undef, !678, !DIExpression(), !954)
    #dbg_value(ptr %4, !682, !DIExpression(), !953)
    #dbg_value(ptr undef, !685, !DIExpression(), !953)
    #dbg_value(ptr %4, !689, !DIExpression(), !952)
    #dbg_value(ptr undef, !692, !DIExpression(), !952)
    #dbg_value(ptr %4, !696, !DIExpression(), !951)
    #dbg_value(ptr undef, !699, !DIExpression(), !951)
    #dbg_value(ptr %4, !703, !DIExpression(), !945)
    #dbg_value(ptr undef, !706, !DIExpression(), !945)
  store ptr %93, ptr %4, align 8, !dbg !1386, !tbaa !1048
  %113 = getelementptr inbounds nuw i8, ptr %4, i64 8, !dbg !1387
  store ptr %92, ptr %113, align 8, !dbg !1388, !tbaa !1051
  %114 = getelementptr inbounds nuw i8, ptr %4, i64 16, !dbg !1389
  store ptr %92, ptr %114, align 8, !dbg !1390, !tbaa !716
    #dbg_value(ptr null, !735, !DIExpression(DW_OP_LLVM_fragment, 0, 64), !1045)
    #dbg_value(ptr null, !735, !DIExpression(DW_OP_LLVM_fragment, 64, 64), !1045)
    #dbg_value(ptr null, !735, !DIExpression(DW_OP_LLVM_fragment, 128, 64), !1045)
  %115 = getelementptr inbounds nuw i8, ptr %4, i64 24, !dbg !1391
  store i32 %112, ptr %115, align 8, !dbg !1392
  %116 = getelementptr inbounds nuw i8, ptr %4, i64 28, !dbg !1392
  store i32 %111, ptr %116, align 4, !dbg !1392
  %117 = getelementptr inbounds nuw i8, ptr %4, i64 32, !dbg !1392
  store ptr null, ptr %117, align 8, !dbg !1392
  call void @_Z5carry3Box(ptr dead_on_unwind nonnull writable sret(%struct.Box) align 8 %3, ptr noundef nonnull align 8 %4), !dbg !1393
    #dbg_value(ptr %4, !782, !DIExpression(), !1394)
    #dbg_value(ptr %4, !774, !DIExpression(), !1396)
    #dbg_value(ptr %4, !769, !DIExpression(), !1398)
  %118 = load ptr, ptr %4, align 8, !dbg !1400, !tbaa !1048
    #dbg_value(ptr %4, !762, !DIExpression(), !1401)
    #dbg_value(ptr %118, !763, !DIExpression(), !1401)
    #dbg_value(!DIArgList(ptr poison, ptr poison), !764, !DIExpression(DW_OP_LLVM_arg, 0, DW_OP_LLVM_arg, 1, DW_OP_minus, DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !1401)
  %119 = icmp eq ptr %118, null, !dbg !1403
  br i1 %119, label %125, label %120, !dbg !1404

120:                                              ; preds = %110
  %121 = load ptr, ptr %114, align 8, !dbg !1405, !tbaa !716
    #dbg_value(!DIArgList(ptr %121, ptr %118), !764, !DIExpression(DW_OP_LLVM_arg, 0, DW_OP_LLVM_arg, 1, DW_OP_minus, DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !1401)
  %122 = ptrtoint ptr %121 to i64, !dbg !1406
    #dbg_value(!DIArgList(i64 %122, ptr %118), !764, !DIExpression(DW_OP_LLVM_arg, 0, DW_OP_LLVM_arg, 1, DW_OP_minus, DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !1401)
  %123 = ptrtoint ptr %118 to i64, !dbg !1406
    #dbg_value(!DIArgList(i64 %122, i64 %123), !764, !DIExpression(DW_OP_LLVM_arg, 0, DW_OP_LLVM_arg, 1, DW_OP_minus, DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !1401)
  %124 = sub i64 %122, %123, !dbg !1406
    #dbg_value(i64 %124, !764, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !1401)
    #dbg_value(ptr %4, !755, !DIExpression(), !1407)
    #dbg_value(ptr %118, !756, !DIExpression(), !1407)
    #dbg_value(i64 %124, !757, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !1407)
    #dbg_value(ptr %4, !748, !DIExpression(), !1409)
    #dbg_value(ptr %118, !750, !DIExpression(), !1409)
    #dbg_value(i64 %124, !751, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !1409)
    #dbg_value(ptr %4, !738, !DIExpression(), !1411)
    #dbg_value(ptr %118, !741, !DIExpression(), !1411)
    #dbg_value(i64 %124, !742, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !1411)
  tail call void @_ZdlPvm(ptr noundef nonnull %118, i64 noundef %124) #10, !dbg !1413
  br label %125, !dbg !1414

125:                                              ; preds = %110, %120
    #dbg_value(ptr %3, !782, !DIExpression(), !1415)
    #dbg_value(ptr %3, !774, !DIExpression(), !1417)
    #dbg_value(ptr %3, !769, !DIExpression(), !1419)
  %126 = load ptr, ptr %3, align 8, !dbg !1421, !tbaa !1048
    #dbg_value(ptr %3, !762, !DIExpression(), !1422)
    #dbg_value(ptr %126, !763, !DIExpression(), !1422)
    #dbg_value(!DIArgList(ptr poison, ptr poison), !764, !DIExpression(DW_OP_LLVM_arg, 0, DW_OP_LLVM_arg, 1, DW_OP_minus, DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !1422)
  %127 = icmp eq ptr %126, null, !dbg !1424
  br i1 %127, label %134, label %128, !dbg !1425

128:                                              ; preds = %125
  %129 = getelementptr inbounds nuw i8, ptr %3, i64 16, !dbg !1426
  %130 = load ptr, ptr %129, align 8, !dbg !1426, !tbaa !716
    #dbg_value(!DIArgList(ptr %130, ptr %126), !764, !DIExpression(DW_OP_LLVM_arg, 0, DW_OP_LLVM_arg, 1, DW_OP_minus, DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !1422)
  %131 = ptrtoint ptr %130 to i64, !dbg !1427
    #dbg_value(!DIArgList(i64 %131, ptr %126), !764, !DIExpression(DW_OP_LLVM_arg, 0, DW_OP_LLVM_arg, 1, DW_OP_minus, DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !1422)
  %132 = ptrtoint ptr %126 to i64, !dbg !1427
    #dbg_value(!DIArgList(i64 %131, i64 %132), !764, !DIExpression(DW_OP_LLVM_arg, 0, DW_OP_LLVM_arg, 1, DW_OP_minus, DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !1422)
  %133 = sub i64 %131, %132, !dbg !1427
    #dbg_value(i64 %133, !764, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !1422)
    #dbg_value(ptr %3, !755, !DIExpression(), !1428)
    #dbg_value(ptr %126, !756, !DIExpression(), !1428)
    #dbg_value(i64 %133, !757, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !1428)
    #dbg_value(ptr %3, !748, !DIExpression(), !1430)
    #dbg_value(ptr %126, !750, !DIExpression(), !1430)
    #dbg_value(i64 %133, !751, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !1430)
    #dbg_value(ptr %3, !738, !DIExpression(), !1432)
    #dbg_value(ptr %126, !741, !DIExpression(), !1432)
    #dbg_value(i64 %133, !742, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !1432)
  tail call void @_ZdlPvm(ptr noundef nonnull %126, i64 noundef %133) #10, !dbg !1434
  br label %134, !dbg !1435

134:                                              ; preds = %128, %125
  call void @llvm.lifetime.end.p0(ptr nonnull %3) #9, !dbg !1436
    #dbg_value(ptr undef, !782, !DIExpression(), !944)
    #dbg_value(ptr undef, !774, !DIExpression(), !943)
    #dbg_value(ptr undef, !769, !DIExpression(), !942)
    #dbg_value(ptr undef, !762, !DIExpression(), !941)
    #dbg_value(ptr null, !763, !DIExpression(), !941)
    #dbg_value(!DIArgList(ptr poison, ptr poison), !764, !DIExpression(DW_OP_LLVM_arg, 0, DW_OP_LLVM_arg, 1, DW_OP_minus, DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !941)
    #dbg_value(ptr undef, !774, !DIExpression(), !858)
    #dbg_value(ptr undef, !769, !DIExpression(), !857)
    #dbg_value(ptr undef, !762, !DIExpression(), !856)
    #dbg_value(ptr %69, !763, !DIExpression(), !856)
    #dbg_value(!DIArgList(ptr poison, ptr poison), !764, !DIExpression(DW_OP_LLVM_arg, 0, DW_OP_LLVM_arg, 1, DW_OP_minus, DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !856)
  %135 = icmp eq ptr %69, null, !dbg !1437
  br i1 %135, label %139, label %136, !dbg !1438

136:                                              ; preds = %134
    #dbg_value(!DIArgList(i64 %70, ptr %69), !764, !DIExpression(DW_OP_LLVM_arg, 0, DW_OP_LLVM_arg, 1, DW_OP_minus, DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !856)
    #dbg_value(!DIArgList(i64 %70, ptr %69), !764, !DIExpression(DW_OP_LLVM_arg, 0, DW_OP_LLVM_arg, 1, DW_OP_minus, DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !856)
  %137 = ptrtoint ptr %69 to i64, !dbg !1439
    #dbg_value(!DIArgList(i64 %70, i64 %137), !764, !DIExpression(DW_OP_LLVM_arg, 0, DW_OP_LLVM_arg, 1, DW_OP_minus, DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !856)
  %138 = sub i64 %70, %137, !dbg !1439
    #dbg_value(i64 %138, !764, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !856)
    #dbg_value(ptr undef, !755, !DIExpression(), !855)
    #dbg_value(ptr %69, !756, !DIExpression(), !855)
    #dbg_value(i64 %138, !757, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !855)
    #dbg_value(ptr undef, !748, !DIExpression(), !854)
    #dbg_value(ptr %69, !750, !DIExpression(), !854)
    #dbg_value(i64 %138, !751, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !854)
    #dbg_value(ptr undef, !738, !DIExpression(), !847)
    #dbg_value(ptr %69, !741, !DIExpression(), !847)
    #dbg_value(i64 %138, !742, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !847)
  tail call void @_ZdlPvm(ptr noundef nonnull %69, i64 noundef %138) #10, !dbg !1440
  br label %139, !dbg !1441

139:                                              ; preds = %134, %136
    #dbg_value(ptr undef, !782, !DIExpression(), !803)
    #dbg_value(ptr undef, !774, !DIExpression(), !802)
    #dbg_value(ptr undef, !769, !DIExpression(), !801)
    #dbg_value(ptr undef, !762, !DIExpression(), !800)
    #dbg_value(ptr %6, !763, !DIExpression(), !800)
    #dbg_value(!DIArgList(ptr poison, ptr poison), !764, !DIExpression(DW_OP_LLVM_arg, 0, DW_OP_LLVM_arg, 1, DW_OP_minus, DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !800)
  %140 = icmp eq ptr %6, null, !dbg !1442
  br i1 %140, label %144, label %141, !dbg !1443

141:                                              ; preds = %139
    #dbg_value(!DIArgList(ptr %10, ptr %6), !764, !DIExpression(DW_OP_LLVM_arg, 0, DW_OP_LLVM_arg, 1, DW_OP_minus, DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !800)
  %142 = ptrtoint ptr %10 to i64, !dbg !1444
    #dbg_value(!DIArgList(i64 %142, i64 %72), !764, !DIExpression(DW_OP_LLVM_arg, 0, DW_OP_LLVM_arg, 1, DW_OP_minus, DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !800)
  %143 = sub i64 %142, %72, !dbg !1444
    #dbg_value(i64 %143, !764, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !800)
    #dbg_value(ptr undef, !755, !DIExpression(), !799)
    #dbg_value(ptr %6, !756, !DIExpression(), !799)
    #dbg_value(i64 %143, !757, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !799)
    #dbg_value(ptr undef, !748, !DIExpression(), !798)
    #dbg_value(ptr %6, !750, !DIExpression(), !798)
    #dbg_value(i64 %143, !751, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !798)
    #dbg_value(ptr undef, !738, !DIExpression(), !790)
    #dbg_value(ptr %6, !741, !DIExpression(), !790)
    #dbg_value(i64 %143, !742, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !790)
  tail call void @_ZdlPvm(ptr noundef nonnull %6, i64 noundef %143) #10, !dbg !1445
  br label %144, !dbg !1446

144:                                              ; preds = %139, %141
  ret i32 %112, !dbg !1447

145:                                              ; preds = %19, %15
  %146 = landingpad { ptr, i32 }
          cleanup, !dbg !1436
  br label %153, !dbg !1448

147:                                              ; preds = %79, %81
  %148 = landingpad { ptr, i32 }
          cleanup, !dbg !1436
    #dbg_value(ptr undef, !774, !DIExpression(), !846)
    #dbg_value(ptr undef, !769, !DIExpression(), !845)
    #dbg_value(ptr undef, !762, !DIExpression(), !844)
    #dbg_value(ptr %69, !763, !DIExpression(), !844)
    #dbg_value(!DIArgList(ptr poison, ptr poison), !764, !DIExpression(DW_OP_LLVM_arg, 0, DW_OP_LLVM_arg, 1, DW_OP_minus, DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !844)
  %149 = icmp eq ptr %69, null, !dbg !1449
  br i1 %149, label %153, label %150, !dbg !1450

150:                                              ; preds = %147
    #dbg_value(!DIArgList(i64 %70, ptr %69), !764, !DIExpression(DW_OP_LLVM_arg, 0, DW_OP_LLVM_arg, 1, DW_OP_minus, DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !844)
    #dbg_value(!DIArgList(i64 %70, ptr %69), !764, !DIExpression(DW_OP_LLVM_arg, 0, DW_OP_LLVM_arg, 1, DW_OP_minus, DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !844)
  %151 = ptrtoint ptr %69 to i64, !dbg !1222
    #dbg_value(!DIArgList(i64 %70, i64 %151), !764, !DIExpression(DW_OP_LLVM_arg, 0, DW_OP_LLVM_arg, 1, DW_OP_minus, DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !844)
  %152 = sub i64 %70, %151, !dbg !1222
    #dbg_value(i64 %152, !764, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !844)
    #dbg_value(ptr undef, !755, !DIExpression(), !843)
    #dbg_value(ptr %69, !756, !DIExpression(), !843)
    #dbg_value(i64 %152, !757, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !843)
    #dbg_value(ptr undef, !748, !DIExpression(), !842)
    #dbg_value(ptr %69, !750, !DIExpression(), !842)
    #dbg_value(i64 %152, !751, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !842)
    #dbg_value(ptr undef, !738, !DIExpression(), !835)
    #dbg_value(ptr %69, !741, !DIExpression(), !835)
    #dbg_value(i64 %152, !742, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !835)
  tail call void @_ZdlPvm(ptr noundef nonnull %69, i64 noundef %152) #10, !dbg !1451
  br label %153, !dbg !1452

153:                                              ; preds = %150, %147, %145
  %154 = phi { ptr, i32 } [ %146, %145 ], [ %148, %147 ], [ %148, %150 ]
    #dbg_value(ptr undef, !782, !DIExpression(), !789)
    #dbg_value(ptr undef, !774, !DIExpression(), !788)
    #dbg_value(ptr undef, !769, !DIExpression(), !787)
    #dbg_value(ptr undef, !762, !DIExpression(), !786)
    #dbg_value(ptr %6, !763, !DIExpression(), !786)
    #dbg_value(!DIArgList(ptr poison, ptr poison), !764, !DIExpression(DW_OP_LLVM_arg, 0, DW_OP_LLVM_arg, 1, DW_OP_minus, DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !786)
  %155 = icmp eq ptr %6, null, !dbg !1453
  br i1 %155, label %160, label %156, !dbg !1454

156:                                              ; preds = %153
    #dbg_value(!DIArgList(ptr %10, ptr %6), !764, !DIExpression(DW_OP_LLVM_arg, 0, DW_OP_LLVM_arg, 1, DW_OP_minus, DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !786)
  %157 = ptrtoint ptr %10 to i64, !dbg !1455
    #dbg_value(!DIArgList(i64 %157, ptr %6), !764, !DIExpression(DW_OP_LLVM_arg, 0, DW_OP_LLVM_arg, 1, DW_OP_minus, DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !786)
  %158 = ptrtoint ptr %6 to i64, !dbg !1455
    #dbg_value(!DIArgList(i64 %157, i64 %158), !764, !DIExpression(DW_OP_LLVM_arg, 0, DW_OP_LLVM_arg, 1, DW_OP_minus, DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !786)
  %159 = sub i64 %157, %158, !dbg !1455
    #dbg_value(i64 %159, !764, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !786)
    #dbg_value(ptr undef, !755, !DIExpression(), !785)
    #dbg_value(ptr %6, !756, !DIExpression(), !785)
    #dbg_value(i64 %159, !757, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !785)
    #dbg_value(ptr undef, !748, !DIExpression(), !784)
    #dbg_value(ptr %6, !750, !DIExpression(), !784)
    #dbg_value(i64 %159, !751, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !784)
    #dbg_value(ptr undef, !738, !DIExpression(), !744)
    #dbg_value(ptr %6, !741, !DIExpression(), !744)
    #dbg_value(i64 %159, !742, !DIExpression(DW_OP_constu, 2, DW_OP_shra, DW_OP_stack_value), !744)
  tail call void @_ZdlPvm(ptr noundef nonnull %6, i64 noundef %159) #10, !dbg !1456
  br label %160, !dbg !1457

160:                                              ; preds = %153, %156
  resume { ptr, i32 } %154, !dbg !1436
}

; Function Attrs: mustprogress nocallback nofree nosync nounwind willreturn memory(argmem: readwrite)
declare void @llvm.lifetime.start.p0(ptr captures(none)) #2

; Function Attrs: mustprogress nocallback nofree nosync nounwind willreturn memory(argmem: readwrite)
declare void @llvm.memcpy.p0.p0.i64(ptr noalias writeonly captures(none), ptr noalias readonly captures(none), i64, i1 immarg) #2

declare i32 @__gxx_personality_v0(...)

; Function Attrs: mustprogress nocallback nofree nosync nounwind willreturn memory(argmem: readwrite)
declare void @llvm.lifetime.end.p0(ptr captures(none)) #2

; Function Attrs: noreturn
declare void @_ZSt20__throw_length_errorPKc(ptr noundef) local_unnamed_addr #3

; Function Attrs: noreturn
declare void @_ZSt28__throw_bad_array_new_lengthv() local_unnamed_addr #3

; Function Attrs: nobuiltin allocsize(0)
declare !dbg !1458 noundef nonnull ptr @_Znwm(i64 noundef) local_unnamed_addr #4

; Function Attrs: nobuiltin nounwind
declare !dbg !1462 void @_ZdlPvm(ptr noundef, i64 noundef) local_unnamed_addr #5

; Function Attrs: mustprogress nocallback nofree nosync nounwind willreturn memory(argmem: readwrite)
declare void @llvm.memmove.p0.p0.i64(ptr writeonly captures(none), ptr readonly captures(none), i64, i1 immarg) #2

; Function Attrs: nocallback nofree nosync nounwind willreturn memory(argmem: write)
declare void @llvm.memset.p0.i64(ptr writeonly captures(none), i8, i64, i1 immarg) #6

attributes #0 = { mustprogress nofree noinline norecurse nosync nounwind willreturn memory(argmem: readwrite) uwtable "min-legal-vector-width"="0" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cmov,+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "tune-cpu"="generic" }
attributes #1 = { mustprogress uwtable "min-legal-vector-width"="0" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cmov,+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "tune-cpu"="generic" }
attributes #2 = { mustprogress nocallback nofree nosync nounwind willreturn memory(argmem: readwrite) }
attributes #3 = { noreturn "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cmov,+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "tune-cpu"="generic" }
attributes #4 = { nobuiltin allocsize(0) "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cmov,+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "tune-cpu"="generic" }
attributes #5 = { nobuiltin nounwind "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cmov,+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "tune-cpu"="generic" }
attributes #6 = { nocallback nofree nosync nounwind willreturn memory(argmem: write) }
attributes #7 = { noreturn }
attributes #8 = { builtin allocsize(0) }
attributes #9 = { nounwind }
attributes #10 = { builtin nounwind }

!llvm.dbg.cu = !{!8}
!llvm.module.flags = !{!639, !640, !641, !642, !643, !644}
!llvm.ident = !{!645}
!llvm.errno.tbaa = !{!646}

!0 = !DIGlobalVariableExpression(var: !1, expr: !DIExpression())
!1 = distinct !DIGlobalVariable(scope: null, file: !2, line: 1911, type: !3, isLocal: true, isDefinition: true)
!2 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/bits/stl_vector.h", directory: "", checksumkind: CSK_MD5, checksum: "514164964ac06e2061e9e779d8cf420e")
!3 = !DICompositeType(tag: DW_TAG_array_type, baseType: !4, size: 392, elements: !6)
!4 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !5)
!5 = !DIBasicType(name: "char", size: 8, encoding: DW_ATE_signed_char)
!6 = !{!7}
!7 = !DISubrange(count: 49)
!8 = distinct !DICompileUnit(language: DW_LANG_C_plus_plus_14, file: !9, producer: "Ubuntu clang version 23.1.4 (++20261018124056+71c76755a8ff-1~exp1~20261018124211.83)", isOptimized: true, runtimeVersion: 0, emissionKind: FullDebug, retainedTypes: !10, globals: !623, imports: !624, splitDebugInlining: false, nameTableKind: None)
!9 = !DIFile(filename: "prototype/fixtures/fold_recurrence.cpp", directory: "/home/huawei/fold-state-jump-research", checksumkind: CSK_MD5, checksum: "f85ce546af87965d97eed5ffb2046c4d")
!10 = !{!11, !620, !276, !69, !39, !622, !356, !198, !296, !419, !49, !43, !141, !21, !18, !14, !357, !420}
!11 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "Box", file: !9, line: 12, size: 320, flags: DIFlagTypePassByReference | DIFlagNonTrivial, elements: !12, identifier: "_ZTS3Box")
!12 = !{!13, !614, !619}
!13 = !DIDerivedType(tag: DW_TAG_member, name: "payload", scope: !11, file: !9, line: 13, baseType: !14, size: 192)
!14 = distinct !DICompositeType(tag: DW_TAG_class_type, name: "vector<int, std::allocator<int> >", scope: !15, file: !2, line: 428, size: 192, flags: DIFlagTypePassByReference | DIFlagNonTrivial, elements: !16, templateParams: !612, identifier: "_ZTSSt6vectorIiSaIiEE")
!15 = !DINamespace(name: "std", scope: null)
!16 = !{!17, !235, !254, !270, !271, !277, !280, !283, !287, !293, !297, !303, !308, !312, !322, !325, !328, !331, !336, !337, !341, !344, !347, !350, !353, !416, !477, !478, !479, !484, !489, !490, !491, !492, !493, !494, !495, !498, !499, !502, !503, !504, !505, !508, !509, !517, !524, !527, !528, !529, !532, !535, !536, !537, !540, !543, !546, !550, !551, !554, !557, !560, !563, !566, !569, !572, !573, !574, !575, !576, !579, !580, !583, !584, !585, !589, !592, !597, !600, !603, !606, !609}
!17 = !DIDerivedType(tag: DW_TAG_inheritance, scope: !14, baseType: !18, flags: DIFlagProtected, extraData: i32 0)
!18 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "_Vector_base<int, std::allocator<int> >", scope: !15, file: !2, line: 85, size: 192, flags: DIFlagTypePassByReference | DIFlagNonTrivial, elements: !19, templateParams: !234, identifier: "_ZTSSt12_Vector_baseIiSaIiEE")
!19 = !{!20, !185, !190, !195, !199, !202, !207, !210, !213, !217, !220, !223, !226, !227, !230, !233}
!20 = !DIDerivedType(tag: DW_TAG_member, name: "_M_impl", scope: !18, file: !2, line: 374, baseType: !21, size: 192)
!21 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "_Vector_impl", scope: !18, file: !2, line: 133, size: 192, flags: DIFlagTypePassByReference | DIFlagNonTrivial, elements: !22, identifier: "_ZTSNSt12_Vector_baseIiSaIiEE12_Vector_implE")
!22 = !{!23, !140, !165, !169, !174, !178, !182}
!23 = !DIDerivedType(tag: DW_TAG_inheritance, scope: !21, baseType: !24, extraData: i32 0)
!24 = !DIDerivedType(tag: DW_TAG_typedef, name: "_Tp_alloc_type", scope: !18, file: !2, line: 88, baseType: !25)
!25 = !DIDerivedType(tag: DW_TAG_typedef, name: "other", scope: !27, file: !26, line: 126, baseType: !139)
!26 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/ext/alloc_traits.h", directory: "")
!27 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "rebind<int>", scope: !28, file: !26, line: 125, size: 8, flags: DIFlagTypePassByValue, elements: !138, templateParams: !81, identifier: "_ZTSN9__gnu_cxx14__alloc_traitsISaIiEiE6rebindIiEE")
!28 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "__alloc_traits<std::allocator<int>, int>", scope: !29, file: !26, line: 45, size: 8, flags: DIFlagTypePassByValue, elements: !30, templateParams: !136, identifier: "_ZTSN9__gnu_cxx14__alloc_traitsISaIiEiEE")
!29 = !DINamespace(name: "__gnu_cxx", scope: null)
!30 = !{!31, !122, !125, !128, !132, !133, !134, !135}
!31 = !DIDerivedType(tag: DW_TAG_inheritance, scope: !28, baseType: !32, extraData: i32 0)
!32 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "allocator_traits<std::allocator<int> >", scope: !15, file: !33, line: 428, size: 8, flags: DIFlagTypePassByValue, elements: !34, templateParams: !120, identifier: "_ZTSSt16allocator_traitsISaIiEE")
!33 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/bits/alloc_traits.h", directory: "", checksumkind: CSK_MD5, checksum: "ba5569b3568669c1c77efc18640dd1aa")
!34 = !{!35, !104, !108, !111, !117}
!35 = !DISubprogram(name: "allocate", linkageName: "_ZNSt16allocator_traitsISaIiEE8allocateERS0_m", scope: !32, file: !33, line: 481, type: !36, scopeLine: 481, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: DISPFlagOptimized)
!36 = !DISubroutineType(types: !37)
!37 = !{!38, !41, !103}
!38 = !DIDerivedType(tag: DW_TAG_typedef, name: "pointer", scope: !32, file: !33, line: 437, baseType: !39)
!39 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !40, size: 64)
!40 = !DIBasicType(name: "int", size: 32, encoding: DW_ATE_signed)
!41 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !42, size: 64)
!42 = !DIDerivedType(tag: DW_TAG_typedef, name: "allocator_type", scope: !32, file: !33, line: 431, baseType: !43)
!43 = distinct !DICompositeType(tag: DW_TAG_class_type, name: "allocator<int>", scope: !15, file: !44, line: 130, size: 8, flags: DIFlagTypePassByReference | DIFlagNonTrivial, elements: !45, templateParams: !81, identifier: "_ZTSSaIiE")
!44 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/bits/allocator.h", directory: "", checksumkind: CSK_MD5, checksum: "9c5b773ad00830bea46f2a8fa4ac22e7")
!45 = !{!46, !83, !87, !92, !96, !97, !100}
!46 = !DIDerivedType(tag: DW_TAG_inheritance, scope: !43, baseType: !47, flags: DIFlagPublic, extraData: i32 0)
!47 = !DIDerivedType(tag: DW_TAG_typedef, name: "__allocator_base<int>", scope: !15, file: !48, line: 47, baseType: !49)
!48 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/x86_64-linux-gnu/c++/13/bits/c++allocator.h", directory: "", checksumkind: CSK_MD5, checksum: "f56d3b48d132e35738b60e08703928ec")
!49 = distinct !DICompositeType(tag: DW_TAG_class_type, name: "__new_allocator<int>", scope: !15, file: !50, line: 63, size: 8, flags: DIFlagTypePassByReference | DIFlagNonTrivial, elements: !51, templateParams: !81, identifier: "_ZTSSt15__new_allocatorIiE")
!50 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/bits/new_allocator.h", directory: "", checksumkind: CSK_MD5, checksum: "c7892ebb1170c1f49c5be98396a83230")
!51 = !{!52, !56, !61, !65, !74, !77}
!52 = !DISubprogram(name: "__new_allocator", linkageName: "_ZNSt15__new_allocatorIiEC4Ev", scope: !49, file: !50, line: 88, type: !53, scopeLine: 88, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!53 = !DISubroutineType(types: !54)
!54 = !{null, !55}
!55 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !49, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!56 = !DISubprogram(name: "__new_allocator", linkageName: "_ZNSt15__new_allocatorIiEC4ERKS0_", scope: !49, file: !50, line: 92, type: !57, scopeLine: 92, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!57 = !DISubroutineType(types: !58)
!58 = !{null, !55, !59}
!59 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !60, size: 64)
!60 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !49)
!61 = !DISubprogram(name: "operator=", linkageName: "_ZNSt15__new_allocatorIiEaSERKS0_", scope: !49, file: !50, line: 100, type: !62, scopeLine: 100, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!62 = !DISubroutineType(types: !63)
!63 = !{!64, !55, !59}
!64 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !49, size: 64)
!65 = !DISubprogram(name: "allocate", linkageName: "_ZNSt15__new_allocatorIiE8allocateEmPKv", scope: !49, file: !50, line: 126, type: !66, scopeLine: 126, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!66 = !DISubroutineType(types: !67)
!67 = !{!39, !55, !68, !72}
!68 = !DIDerivedType(tag: DW_TAG_typedef, name: "size_type", scope: !49, file: !50, line: 67, baseType: !69, flags: DIFlagPublic)
!69 = !DIDerivedType(tag: DW_TAG_typedef, name: "size_t", scope: !15, file: !70, line: 308, baseType: !71)
!70 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/x86_64-linux-gnu/c++/13/bits/c++config.h", directory: "", checksumkind: CSK_MD5, checksum: "449d6dbeca4f3eea299d97c24eb9ed95")
!71 = !DIBasicType(name: "unsigned long", size: 64, encoding: DW_ATE_unsigned)
!72 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !73, size: 64)
!73 = !DIDerivedType(tag: DW_TAG_const_type, baseType: null)
!74 = !DISubprogram(name: "deallocate", linkageName: "_ZNSt15__new_allocatorIiE10deallocateEPim", scope: !49, file: !50, line: 156, type: !75, scopeLine: 156, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!75 = !DISubroutineType(types: !76)
!76 = !{null, !55, !39, !68}
!77 = !DISubprogram(name: "_M_max_size", linkageName: "_ZNKSt15__new_allocatorIiE11_M_max_sizeEv", scope: !49, file: !50, line: 230, type: !78, scopeLine: 230, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!78 = !DISubroutineType(types: !79)
!79 = !{!68, !80}
!80 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !60, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!81 = !{!82}
!82 = !DITemplateTypeParameter(name: "_Tp", type: !40)
!83 = !DISubprogram(name: "allocator", linkageName: "_ZNSaIiEC4Ev", scope: !43, file: !44, line: 163, type: !84, scopeLine: 163, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!84 = !DISubroutineType(types: !85)
!85 = !{null, !86}
!86 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !43, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!87 = !DISubprogram(name: "allocator", linkageName: "_ZNSaIiEC4ERKS_", scope: !43, file: !44, line: 167, type: !88, scopeLine: 167, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!88 = !DISubroutineType(types: !89)
!89 = !{null, !86, !90}
!90 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !91, size: 64)
!91 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !43)
!92 = !DISubprogram(name: "operator=", linkageName: "_ZNSaIiEaSERKS_", scope: !43, file: !44, line: 172, type: !93, scopeLine: 172, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!93 = !DISubroutineType(types: !94)
!94 = !{!95, !86, !90}
!95 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !43, size: 64)
!96 = !DISubprogram(name: "~allocator", linkageName: "_ZNSaIiED4Ev", scope: !43, file: !44, line: 184, type: !84, scopeLine: 184, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!97 = !DISubprogram(name: "allocate", linkageName: "_ZNSaIiE8allocateEm", scope: !43, file: !44, line: 189, type: !98, scopeLine: 189, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!98 = !DISubroutineType(types: !99)
!99 = !{!39, !86, !69}
!100 = !DISubprogram(name: "deallocate", linkageName: "_ZNSaIiE10deallocateEPim", scope: !43, file: !44, line: 203, type: !101, scopeLine: 203, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!101 = !DISubroutineType(types: !102)
!102 = !{null, !86, !39, !69}
!103 = !DIDerivedType(tag: DW_TAG_typedef, name: "size_type", file: !33, line: 452, baseType: !69)
!104 = !DISubprogram(name: "allocate", linkageName: "_ZNSt16allocator_traitsISaIiEE8allocateERS0_mPKv", scope: !32, file: !33, line: 496, type: !105, scopeLine: 496, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: DISPFlagOptimized)
!105 = !DISubroutineType(types: !106)
!106 = !{!38, !41, !103, !107}
!107 = !DIDerivedType(tag: DW_TAG_typedef, name: "const_void_pointer", file: !33, line: 446, baseType: !72)
!108 = !DISubprogram(name: "deallocate", linkageName: "_ZNSt16allocator_traitsISaIiEE10deallocateERS0_Pim", scope: !32, file: !33, line: 516, type: !109, scopeLine: 516, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: DISPFlagOptimized)
!109 = !DISubroutineType(types: !110)
!110 = !{null, !41, !38, !103}
!111 = !DISubprogram(name: "max_size", linkageName: "_ZNSt16allocator_traitsISaIiEE8max_sizeERKS0_", scope: !32, file: !33, line: 571, type: !112, scopeLine: 571, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: DISPFlagOptimized)
!112 = !DISubroutineType(types: !113)
!113 = !{!114, !115}
!114 = !DIDerivedType(tag: DW_TAG_typedef, name: "size_type", scope: !32, file: !33, line: 452, baseType: !69)
!115 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !116, size: 64)
!116 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !42)
!117 = !DISubprogram(name: "select_on_container_copy_construction", linkageName: "_ZNSt16allocator_traitsISaIiEE37select_on_container_copy_constructionERKS0_", scope: !32, file: !33, line: 587, type: !118, scopeLine: 587, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: DISPFlagOptimized)
!118 = !DISubroutineType(types: !119)
!119 = !{!42, !115}
!120 = !{!121}
!121 = !DITemplateTypeParameter(name: "_Alloc", type: !43)
!122 = !DISubprogram(name: "_S_select_on_copy", linkageName: "_ZN9__gnu_cxx14__alloc_traitsISaIiEiE17_S_select_on_copyERKS1_", scope: !28, file: !26, line: 97, type: !123, scopeLine: 97, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: DISPFlagOptimized)
!123 = !DISubroutineType(types: !124)
!124 = !{!43, !90}
!125 = !DISubprogram(name: "_S_on_swap", linkageName: "_ZN9__gnu_cxx14__alloc_traitsISaIiEiE10_S_on_swapERS1_S3_", scope: !28, file: !26, line: 101, type: !126, scopeLine: 101, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: DISPFlagOptimized)
!126 = !DISubroutineType(types: !127)
!127 = !{null, !95, !95}
!128 = !DISubprogram(name: "_S_propagate_on_copy_assign", linkageName: "_ZN9__gnu_cxx14__alloc_traitsISaIiEiE27_S_propagate_on_copy_assignEv", scope: !28, file: !26, line: 105, type: !129, scopeLine: 105, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: DISPFlagOptimized)
!129 = !DISubroutineType(types: !130)
!130 = !{!131}
!131 = !DIBasicType(name: "bool", size: 8, encoding: DW_ATE_boolean)
!132 = !DISubprogram(name: "_S_propagate_on_move_assign", linkageName: "_ZN9__gnu_cxx14__alloc_traitsISaIiEiE27_S_propagate_on_move_assignEv", scope: !28, file: !26, line: 109, type: !129, scopeLine: 109, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: DISPFlagOptimized)
!133 = !DISubprogram(name: "_S_propagate_on_swap", linkageName: "_ZN9__gnu_cxx14__alloc_traitsISaIiEiE20_S_propagate_on_swapEv", scope: !28, file: !26, line: 113, type: !129, scopeLine: 113, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: DISPFlagOptimized)
!134 = !DISubprogram(name: "_S_always_equal", linkageName: "_ZN9__gnu_cxx14__alloc_traitsISaIiEiE15_S_always_equalEv", scope: !28, file: !26, line: 117, type: !129, scopeLine: 117, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: DISPFlagOptimized)
!135 = !DISubprogram(name: "_S_nothrow_move", linkageName: "_ZN9__gnu_cxx14__alloc_traitsISaIiEiE15_S_nothrow_moveEv", scope: !28, file: !26, line: 121, type: !129, scopeLine: 121, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: DISPFlagOptimized)
!136 = !{!121, !137}
!137 = !DITemplateTypeParameter(type: !40, defaulted: true)
!138 = !{}
!139 = !DIDerivedType(tag: DW_TAG_typedef, name: "rebind_alloc<int>", scope: !32, file: !33, line: 467, baseType: !43)
!140 = !DIDerivedType(tag: DW_TAG_inheritance, scope: !21, baseType: !141, extraData: i32 0)
!141 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "_Vector_impl_data", scope: !18, file: !2, line: 92, size: 192, flags: DIFlagTypePassByReference | DIFlagNonTrivial, elements: !142, identifier: "_ZTSNSt12_Vector_baseIiSaIiEE17_Vector_impl_dataE")
!142 = !{!143, !146, !147, !148, !152, !156, !161}
!143 = !DIDerivedType(tag: DW_TAG_member, name: "_M_start", scope: !141, file: !2, line: 94, baseType: !144, size: 64)
!144 = !DIDerivedType(tag: DW_TAG_typedef, name: "pointer", scope: !18, file: !2, line: 90, baseType: !145)
!145 = !DIDerivedType(tag: DW_TAG_typedef, name: "pointer", scope: !28, file: !26, line: 54, baseType: !38)
!146 = !DIDerivedType(tag: DW_TAG_member, name: "_M_finish", scope: !141, file: !2, line: 95, baseType: !144, size: 64, offset: 64)
!147 = !DIDerivedType(tag: DW_TAG_member, name: "_M_end_of_storage", scope: !141, file: !2, line: 96, baseType: !144, size: 64, offset: 128)
!148 = !DISubprogram(name: "_Vector_impl_data", linkageName: "_ZNSt12_Vector_baseIiSaIiEE17_Vector_impl_dataC4Ev", scope: !141, file: !2, line: 99, type: !149, scopeLine: 99, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!149 = !DISubroutineType(types: !150)
!150 = !{null, !151}
!151 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !141, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!152 = !DISubprogram(name: "_Vector_impl_data", linkageName: "_ZNSt12_Vector_baseIiSaIiEE17_Vector_impl_dataC4EOS2_", scope: !141, file: !2, line: 105, type: !153, scopeLine: 105, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!153 = !DISubroutineType(types: !154)
!154 = !{null, !151, !155}
!155 = !DIDerivedType(tag: DW_TAG_rvalue_reference_type, baseType: !141, size: 64)
!156 = !DISubprogram(name: "_M_copy_data", linkageName: "_ZNSt12_Vector_baseIiSaIiEE17_Vector_impl_data12_M_copy_dataERKS2_", scope: !141, file: !2, line: 113, type: !157, scopeLine: 113, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!157 = !DISubroutineType(types: !158)
!158 = !{null, !151, !159}
!159 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !160, size: 64)
!160 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !141)
!161 = !DISubprogram(name: "_M_swap_data", linkageName: "_ZNSt12_Vector_baseIiSaIiEE17_Vector_impl_data12_M_swap_dataERS2_", scope: !141, file: !2, line: 122, type: !162, scopeLine: 122, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!162 = !DISubroutineType(types: !163)
!163 = !{null, !151, !164}
!164 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !141, size: 64)
!165 = !DISubprogram(name: "_Vector_impl", linkageName: "_ZNSt12_Vector_baseIiSaIiEE12_Vector_implC4EvQ26is_default_constructible_vIN9__gnu_cxx14__alloc_traitsIT0_NS5_10value_typeEE6rebindIT_E5otherEE", scope: !21, file: !2, line: 137, type: !166, scopeLine: 137, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!166 = !DISubroutineType(types: !167)
!167 = !{null, !168}
!168 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !21, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!169 = !DISubprogram(name: "_Vector_impl", linkageName: "_ZNSt12_Vector_baseIiSaIiEE12_Vector_implC4ERKS0_", scope: !21, file: !2, line: 146, type: !170, scopeLine: 146, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!170 = !DISubroutineType(types: !171)
!171 = !{null, !168, !172}
!172 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !173, size: 64)
!173 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !24)
!174 = !DISubprogram(name: "_Vector_impl", linkageName: "_ZNSt12_Vector_baseIiSaIiEE12_Vector_implC4EOS2_", scope: !21, file: !2, line: 154, type: !175, scopeLine: 154, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!175 = !DISubroutineType(types: !176)
!176 = !{null, !168, !177}
!177 = !DIDerivedType(tag: DW_TAG_rvalue_reference_type, baseType: !21, size: 64)
!178 = !DISubprogram(name: "_Vector_impl", linkageName: "_ZNSt12_Vector_baseIiSaIiEE12_Vector_implC4EOS0_", scope: !21, file: !2, line: 159, type: !179, scopeLine: 159, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!179 = !DISubroutineType(types: !180)
!180 = !{null, !168, !181}
!181 = !DIDerivedType(tag: DW_TAG_rvalue_reference_type, baseType: !24, size: 64)
!182 = !DISubprogram(name: "_Vector_impl", linkageName: "_ZNSt12_Vector_baseIiSaIiEE12_Vector_implC4EOS0_OS2_", scope: !21, file: !2, line: 164, type: !183, scopeLine: 164, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!183 = !DISubroutineType(types: !184)
!184 = !{null, !168, !181, !177}
!185 = !DISubprogram(name: "_M_get_Tp_allocator", linkageName: "_ZNSt12_Vector_baseIiSaIiEE19_M_get_Tp_allocatorEv", scope: !18, file: !2, line: 301, type: !186, scopeLine: 301, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!186 = !DISubroutineType(types: !187)
!187 = !{!188, !189}
!188 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !24, size: 64)
!189 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !18, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!190 = !DISubprogram(name: "_M_get_Tp_allocator", linkageName: "_ZNKSt12_Vector_baseIiSaIiEE19_M_get_Tp_allocatorEv", scope: !18, file: !2, line: 306, type: !191, scopeLine: 306, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!191 = !DISubroutineType(types: !192)
!192 = !{!172, !193}
!193 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !194, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!194 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !18)
!195 = !DISubprogram(name: "get_allocator", linkageName: "_ZNKSt12_Vector_baseIiSaIiEE13get_allocatorEv", scope: !18, file: !2, line: 311, type: !196, scopeLine: 311, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!196 = !DISubroutineType(types: !197)
!197 = !{!198, !193}
!198 = !DIDerivedType(tag: DW_TAG_typedef, name: "allocator_type", scope: !18, file: !2, line: 297, baseType: !43)
!199 = !DISubprogram(name: "_Vector_base", linkageName: "_ZNSt12_Vector_baseIiSaIiEEC4Ev", scope: !18, file: !2, line: 315, type: !200, scopeLine: 315, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!200 = !DISubroutineType(types: !201)
!201 = !{null, !189}
!202 = !DISubprogram(name: "_Vector_base", linkageName: "_ZNSt12_Vector_baseIiSaIiEEC4ERKS0_", scope: !18, file: !2, line: 321, type: !203, scopeLine: 321, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!203 = !DISubroutineType(types: !204)
!204 = !{null, !189, !205}
!205 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !206, size: 64)
!206 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !198)
!207 = !DISubprogram(name: "_Vector_base", linkageName: "_ZNSt12_Vector_baseIiSaIiEEC4Em", scope: !18, file: !2, line: 327, type: !208, scopeLine: 327, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!208 = !DISubroutineType(types: !209)
!209 = !{null, !189, !69}
!210 = !DISubprogram(name: "_Vector_base", linkageName: "_ZNSt12_Vector_baseIiSaIiEEC4EmRKS0_", scope: !18, file: !2, line: 333, type: !211, scopeLine: 333, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!211 = !DISubroutineType(types: !212)
!212 = !{null, !189, !69, !205}
!213 = !DISubprogram(name: "_Vector_base", linkageName: "_ZNSt12_Vector_baseIiSaIiEEC4EOS1_", scope: !18, file: !2, line: 338, type: !214, scopeLine: 338, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!214 = !DISubroutineType(types: !215)
!215 = !{null, !189, !216}
!216 = !DIDerivedType(tag: DW_TAG_rvalue_reference_type, baseType: !18, size: 64)
!217 = !DISubprogram(name: "_Vector_base", linkageName: "_ZNSt12_Vector_baseIiSaIiEEC4EOS0_", scope: !18, file: !2, line: 343, type: !218, scopeLine: 343, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!218 = !DISubroutineType(types: !219)
!219 = !{null, !189, !181}
!220 = !DISubprogram(name: "_Vector_base", linkageName: "_ZNSt12_Vector_baseIiSaIiEEC4EOS1_RKS0_", scope: !18, file: !2, line: 347, type: !221, scopeLine: 347, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!221 = !DISubroutineType(types: !222)
!222 = !{null, !189, !216, !205}
!223 = !DISubprogram(name: "_Vector_base", linkageName: "_ZNSt12_Vector_baseIiSaIiEEC4ERKS0_OS1_", scope: !18, file: !2, line: 361, type: !224, scopeLine: 361, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!224 = !DISubroutineType(types: !225)
!225 = !{null, !189, !205, !216}
!226 = !DISubprogram(name: "~_Vector_base", linkageName: "_ZNSt12_Vector_baseIiSaIiEED4Ev", scope: !18, file: !2, line: 367, type: !200, scopeLine: 367, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!227 = !DISubprogram(name: "_M_allocate", linkageName: "_ZNSt12_Vector_baseIiSaIiEE11_M_allocateEm", scope: !18, file: !2, line: 378, type: !228, scopeLine: 378, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!228 = !DISubroutineType(types: !229)
!229 = !{!144, !189, !69}
!230 = !DISubprogram(name: "_M_deallocate", linkageName: "_ZNSt12_Vector_baseIiSaIiEE13_M_deallocateEPim", scope: !18, file: !2, line: 386, type: !231, scopeLine: 386, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!231 = !DISubroutineType(types: !232)
!232 = !{null, !189, !144, !69}
!233 = !DISubprogram(name: "_M_create_storage", linkageName: "_ZNSt12_Vector_baseIiSaIiEE17_M_create_storageEm", scope: !18, file: !2, line: 396, type: !208, scopeLine: 396, flags: DIFlagProtected | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!234 = !{!82, !121}
!235 = !DISubprogram(name: "_S_nothrow_relocate", linkageName: "_ZNSt6vectorIiSaIiEE19_S_nothrow_relocateESt17integral_constantIbLb1EE", scope: !14, file: !2, line: 470, type: !236, scopeLine: 470, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: DISPFlagOptimized)
!236 = !DISubroutineType(types: !237)
!237 = !{!131, !238}
!238 = !DIDerivedType(tag: DW_TAG_typedef, name: "true_type", scope: !15, file: !239, line: 82, baseType: !240)
!239 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/type_traits", directory: "")
!240 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "integral_constant<bool, true>", scope: !15, file: !239, line: 62, size: 8, flags: DIFlagTypePassByValue, elements: !241, templateParams: !251, identifier: "_ZTSSt17integral_constantIbLb1EE")
!241 = !{!242, !244, !250}
!242 = !DIDerivedType(tag: DW_TAG_variable, name: "value", scope: !240, file: !239, line: 64, baseType: !243, flags: DIFlagStaticMember, extraData: i1 true)
!243 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !131)
!244 = !DISubprogram(name: "operator bool", linkageName: "_ZNKSt17integral_constantIbLb1EEcvbEv", scope: !240, file: !239, line: 67, type: !245, scopeLine: 67, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!245 = !DISubroutineType(types: !246)
!246 = !{!247, !248}
!247 = !DIDerivedType(tag: DW_TAG_typedef, name: "value_type", scope: !240, file: !239, line: 65, baseType: !131)
!248 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !249, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!249 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !240)
!250 = !DISubprogram(name: "operator()", linkageName: "_ZNKSt17integral_constantIbLb1EEclEv", scope: !240, file: !239, line: 72, type: !245, scopeLine: 72, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!251 = !{!252, !253}
!252 = !DITemplateTypeParameter(name: "_Tp", type: !131)
!253 = !DITemplateValueParameter(name: "__v", type: !131, value: i1 true)
!254 = !DISubprogram(name: "_S_nothrow_relocate", linkageName: "_ZNSt6vectorIiSaIiEE19_S_nothrow_relocateESt17integral_constantIbLb0EE", scope: !14, file: !2, line: 479, type: !255, scopeLine: 479, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: DISPFlagOptimized)
!255 = !DISubroutineType(types: !256)
!256 = !{!131, !257}
!257 = !DIDerivedType(tag: DW_TAG_typedef, name: "false_type", scope: !15, file: !239, line: 85, baseType: !258)
!258 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "integral_constant<bool, false>", scope: !15, file: !239, line: 62, size: 8, flags: DIFlagTypePassByValue, elements: !259, templateParams: !268, identifier: "_ZTSSt17integral_constantIbLb0EE")
!259 = !{!260, !261, !267}
!260 = !DIDerivedType(tag: DW_TAG_variable, name: "value", scope: !258, file: !239, line: 64, baseType: !243, flags: DIFlagStaticMember, extraData: i1 false)
!261 = !DISubprogram(name: "operator bool", linkageName: "_ZNKSt17integral_constantIbLb0EEcvbEv", scope: !258, file: !239, line: 67, type: !262, scopeLine: 67, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!262 = !DISubroutineType(types: !263)
!263 = !{!264, !265}
!264 = !DIDerivedType(tag: DW_TAG_typedef, name: "value_type", scope: !258, file: !239, line: 65, baseType: !131)
!265 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !266, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!266 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !258)
!267 = !DISubprogram(name: "operator()", linkageName: "_ZNKSt17integral_constantIbLb0EEclEv", scope: !258, file: !239, line: 72, type: !262, scopeLine: 72, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!268 = !{!252, !269}
!269 = !DITemplateValueParameter(name: "__v", type: !131, value: i1 false)
!270 = !DISubprogram(name: "_S_use_relocate", linkageName: "_ZNSt6vectorIiSaIiEE15_S_use_relocateEv", scope: !14, file: !2, line: 483, type: !129, scopeLine: 483, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: DISPFlagOptimized)
!271 = !DISubprogram(name: "_S_do_relocate", linkageName: "_ZNSt6vectorIiSaIiEE14_S_do_relocateEPiS2_S2_RS0_St17integral_constantIbLb1EE", scope: !14, file: !2, line: 492, type: !272, scopeLine: 492, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: DISPFlagOptimized)
!272 = !DISubroutineType(types: !273)
!273 = !{!274, !274, !274, !274, !275, !238}
!274 = !DIDerivedType(tag: DW_TAG_typedef, name: "pointer", scope: !14, file: !2, line: 454, baseType: !144, flags: DIFlagPublic)
!275 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !276, size: 64)
!276 = !DIDerivedType(tag: DW_TAG_typedef, name: "_Tp_alloc_type", scope: !14, file: !2, line: 449, baseType: !24)
!277 = !DISubprogram(name: "_S_do_relocate", linkageName: "_ZNSt6vectorIiSaIiEE14_S_do_relocateEPiS2_S2_RS0_St17integral_constantIbLb0EE", scope: !14, file: !2, line: 499, type: !278, scopeLine: 499, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: DISPFlagOptimized)
!278 = !DISubroutineType(types: !279)
!279 = !{!274, !274, !274, !274, !275, !257}
!280 = !DISubprogram(name: "_S_relocate", linkageName: "_ZNSt6vectorIiSaIiEE11_S_relocateEPiS2_S2_RS0_", scope: !14, file: !2, line: 504, type: !281, scopeLine: 504, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: DISPFlagOptimized)
!281 = !DISubroutineType(types: !282)
!282 = !{!274, !274, !274, !274, !275}
!283 = !DISubprogram(name: "vector", linkageName: "_ZNSt6vectorIiSaIiEEC4Ev", scope: !14, file: !2, line: 531, type: !284, scopeLine: 531, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!284 = !DISubroutineType(types: !285)
!285 = !{null, !286}
!286 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !14, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!287 = !DISubprogram(name: "vector", linkageName: "_ZNSt6vectorIiSaIiEEC4ERKS0_", scope: !14, file: !2, line: 542, type: !288, scopeLine: 542, flags: DIFlagPublic | DIFlagExplicit | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!288 = !DISubroutineType(types: !289)
!289 = !{null, !286, !290}
!290 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !291, size: 64)
!291 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !292)
!292 = !DIDerivedType(tag: DW_TAG_typedef, name: "allocator_type", scope: !14, file: !2, line: 465, baseType: !43, flags: DIFlagPublic)
!293 = !DISubprogram(name: "vector", linkageName: "_ZNSt6vectorIiSaIiEEC4EmRKS0_", scope: !14, file: !2, line: 556, type: !294, scopeLine: 556, flags: DIFlagPublic | DIFlagExplicit | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!294 = !DISubroutineType(types: !295)
!295 = !{null, !286, !296, !290}
!296 = !DIDerivedType(tag: DW_TAG_typedef, name: "size_type", scope: !14, file: !2, line: 463, baseType: !69, flags: DIFlagPublic)
!297 = !DISubprogram(name: "vector", linkageName: "_ZNSt6vectorIiSaIiEEC4EmRKiRKS0_", scope: !14, file: !2, line: 569, type: !298, scopeLine: 569, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!298 = !DISubroutineType(types: !299)
!299 = !{null, !286, !296, !300, !290}
!300 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !301, size: 64)
!301 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !302)
!302 = !DIDerivedType(tag: DW_TAG_typedef, name: "value_type", scope: !14, file: !2, line: 453, baseType: !40, flags: DIFlagPublic)
!303 = !DISubprogram(name: "vector", linkageName: "_ZNSt6vectorIiSaIiEEC4ERKS1_", scope: !14, file: !2, line: 601, type: !304, scopeLine: 601, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!304 = !DISubroutineType(types: !305)
!305 = !{null, !286, !306}
!306 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !307, size: 64)
!307 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !14)
!308 = !DISubprogram(name: "vector", linkageName: "_ZNSt6vectorIiSaIiEEC4EOS1_", scope: !14, file: !2, line: 620, type: !309, scopeLine: 620, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!309 = !DISubroutineType(types: !310)
!310 = !{null, !286, !311}
!311 = !DIDerivedType(tag: DW_TAG_rvalue_reference_type, baseType: !14, size: 64)
!312 = !DISubprogram(name: "vector", linkageName: "_ZNSt6vectorIiSaIiEEC4ERKS1_RKS0_", scope: !14, file: !2, line: 624, type: !313, scopeLine: 624, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!313 = !DISubroutineType(types: !314)
!314 = !{null, !286, !306, !315}
!315 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !316, size: 64)
!316 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !317)
!317 = !DIDerivedType(tag: DW_TAG_typedef, name: "__type_identity_t<std::allocator<int> >", scope: !15, file: !239, line: 143, baseType: !318)
!318 = !DIDerivedType(tag: DW_TAG_typedef, name: "type", scope: !319, file: !239, line: 140, baseType: !43)
!319 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "__type_identity<std::allocator<int> >", scope: !15, file: !239, line: 139, size: 8, flags: DIFlagTypePassByValue, elements: !138, templateParams: !320, identifier: "_ZTSSt15__type_identityISaIiEE")
!320 = !{!321}
!321 = !DITemplateTypeParameter(name: "_Type", type: !43)
!322 = !DISubprogram(name: "vector", linkageName: "_ZNSt6vectorIiSaIiEEC4EOS1_RKS0_St17integral_constantIbLb1EE", scope: !14, file: !2, line: 635, type: !323, scopeLine: 635, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!323 = !DISubroutineType(types: !324)
!324 = !{null, !286, !311, !290, !238}
!325 = !DISubprogram(name: "vector", linkageName: "_ZNSt6vectorIiSaIiEEC4EOS1_RKS0_St17integral_constantIbLb0EE", scope: !14, file: !2, line: 640, type: !326, scopeLine: 640, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!326 = !DISubroutineType(types: !327)
!327 = !{null, !286, !311, !290, !257}
!328 = !DISubprogram(name: "vector", linkageName: "_ZNSt6vectorIiSaIiEEC4EOS1_RKS0_", scope: !14, file: !2, line: 659, type: !329, scopeLine: 659, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!329 = !DISubroutineType(types: !330)
!330 = !{null, !286, !311, !315}
!331 = !DISubprogram(name: "vector", linkageName: "_ZNSt6vectorIiSaIiEEC4ESt16initializer_listIiERKS0_", scope: !14, file: !2, line: 678, type: !332, scopeLine: 678, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!332 = !DISubroutineType(types: !333)
!333 = !{null, !286, !334, !290}
!334 = !DICompositeType(tag: DW_TAG_class_type, name: "initializer_list<int>", scope: !15, file: !335, line: 45, size: 128, flags: DIFlagFwdDecl | DIFlagNonTrivial, identifier: "_ZTSSt16initializer_listIiE")
!335 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/initializer_list", directory: "")
!336 = !DISubprogram(name: "~vector", linkageName: "_ZNSt6vectorIiSaIiEED4Ev", scope: !14, file: !2, line: 733, type: !284, scopeLine: 733, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!337 = !DISubprogram(name: "operator=", linkageName: "_ZNSt6vectorIiSaIiEEaSERKS1_", scope: !14, file: !2, line: 751, type: !338, scopeLine: 751, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!338 = !DISubroutineType(types: !339)
!339 = !{!340, !286, !306}
!340 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !14, size: 64)
!341 = !DISubprogram(name: "operator=", linkageName: "_ZNSt6vectorIiSaIiEEaSEOS1_", scope: !14, file: !2, line: 766, type: !342, scopeLine: 766, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!342 = !DISubroutineType(types: !343)
!343 = !{!340, !286, !311}
!344 = !DISubprogram(name: "operator=", linkageName: "_ZNSt6vectorIiSaIiEEaSESt16initializer_listIiE", scope: !14, file: !2, line: 788, type: !345, scopeLine: 788, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!345 = !DISubroutineType(types: !346)
!346 = !{!340, !286, !334}
!347 = !DISubprogram(name: "assign", linkageName: "_ZNSt6vectorIiSaIiEE6assignEmRKi", scope: !14, file: !2, line: 808, type: !348, scopeLine: 808, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!348 = !DISubroutineType(types: !349)
!349 = !{null, !286, !296, !300}
!350 = !DISubprogram(name: "assign", linkageName: "_ZNSt6vectorIiSaIiEE6assignESt16initializer_listIiE", scope: !14, file: !2, line: 855, type: !351, scopeLine: 855, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!351 = !DISubroutineType(types: !352)
!352 = !{null, !286, !334}
!353 = !DISubprogram(name: "begin", linkageName: "_ZNSt6vectorIiSaIiEE5beginEv", scope: !14, file: !2, line: 873, type: !354, scopeLine: 873, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!354 = !DISubroutineType(types: !355)
!355 = !{!356, !286}
!356 = !DIDerivedType(tag: DW_TAG_typedef, name: "iterator", scope: !14, file: !2, line: 458, baseType: !357, flags: DIFlagPublic)
!357 = distinct !DICompositeType(tag: DW_TAG_class_type, name: "__normal_iterator<int *, std::vector<int, std::allocator<int> > >", scope: !29, file: !358, line: 1047, size: 64, flags: DIFlagTypePassByValue | DIFlagNonTrivial, elements: !359, templateParams: !414, identifier: "_ZTSN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEE")
!358 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/bits/stl_iterator.h", directory: "", checksumkind: CSK_MD5, checksum: "078d2c6e40695db2f690aeaa2795d719")
!359 = !{!360, !361, !365, !370, !382, !387, !391, !394, !395, !396, !403, !406, !409, !410, !411}
!360 = !DIDerivedType(tag: DW_TAG_member, name: "_M_current", scope: !357, file: !358, line: 1050, baseType: !39, size: 64, flags: DIFlagProtected)
!361 = !DISubprogram(name: "__normal_iterator", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEC4Ev", scope: !357, file: !358, line: 1072, type: !362, scopeLine: 1072, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!362 = !DISubroutineType(types: !363)
!363 = !{null, !364}
!364 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !357, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!365 = !DISubprogram(name: "__normal_iterator", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEC4ERKS1_", scope: !357, file: !358, line: 1076, type: !366, scopeLine: 1076, flags: DIFlagPublic | DIFlagExplicit | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!366 = !DISubroutineType(types: !367)
!367 = !{null, !364, !368}
!368 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !369, size: 64)
!369 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !39)
!370 = !DISubprogram(name: "operator*", linkageName: "_ZNK9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEdeEv", scope: !357, file: !358, line: 1099, type: !371, scopeLine: 1099, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!371 = !DISubroutineType(types: !372)
!372 = !{!373, !380}
!373 = !DIDerivedType(tag: DW_TAG_typedef, name: "reference", scope: !357, file: !358, line: 1065, baseType: !374, flags: DIFlagPublic)
!374 = !DIDerivedType(tag: DW_TAG_typedef, name: "reference", scope: !376, file: !375, line: 205, baseType: !379)
!375 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/bits/stl_iterator_base_types.h", directory: "")
!376 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "iterator_traits<int *>", scope: !15, file: !375, line: 198, size: 8, flags: DIFlagTypePassByValue, elements: !138, templateParams: !377, identifier: "_ZTSSt15iterator_traitsIPiE")
!377 = !{!378}
!378 = !DITemplateTypeParameter(name: "_Iterator", type: !39)
!379 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !40, size: 64)
!380 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !381, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!381 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !357)
!382 = !DISubprogram(name: "operator->", linkageName: "_ZNK9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEptEv", scope: !357, file: !358, line: 1104, type: !383, scopeLine: 1104, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!383 = !DISubroutineType(types: !384)
!384 = !{!385, !380}
!385 = !DIDerivedType(tag: DW_TAG_typedef, name: "pointer", scope: !357, file: !358, line: 1066, baseType: !386, flags: DIFlagPublic)
!386 = !DIDerivedType(tag: DW_TAG_typedef, name: "pointer", scope: !376, file: !375, line: 204, baseType: !39)
!387 = !DISubprogram(name: "operator++", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEppEv", scope: !357, file: !358, line: 1109, type: !388, scopeLine: 1109, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!388 = !DISubroutineType(types: !389)
!389 = !{!390, !364}
!390 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !357, size: 64)
!391 = !DISubprogram(name: "operator++", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEppEi", scope: !357, file: !358, line: 1117, type: !392, scopeLine: 1117, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!392 = !DISubroutineType(types: !393)
!393 = !{!357, !364, !40}
!394 = !DISubprogram(name: "operator--", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEmmEv", scope: !357, file: !358, line: 1123, type: !388, scopeLine: 1123, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!395 = !DISubprogram(name: "operator--", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEmmEi", scope: !357, file: !358, line: 1131, type: !392, scopeLine: 1131, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!396 = !DISubprogram(name: "operator[]", linkageName: "_ZNK9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEixEl", scope: !357, file: !358, line: 1137, type: !397, scopeLine: 1137, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!397 = !DISubroutineType(types: !398)
!398 = !{!373, !380, !399}
!399 = !DIDerivedType(tag: DW_TAG_typedef, name: "difference_type", scope: !357, file: !358, line: 1064, baseType: !400, flags: DIFlagPublic)
!400 = !DIDerivedType(tag: DW_TAG_typedef, name: "difference_type", scope: !376, file: !375, line: 203, baseType: !401)
!401 = !DIDerivedType(tag: DW_TAG_typedef, name: "ptrdiff_t", scope: !15, file: !70, line: 309, baseType: !402)
!402 = !DIBasicType(name: "long", size: 64, encoding: DW_ATE_signed)
!403 = !DISubprogram(name: "operator+=", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEpLEl", scope: !357, file: !358, line: 1142, type: !404, scopeLine: 1142, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!404 = !DISubroutineType(types: !405)
!405 = !{!390, !364, !399}
!406 = !DISubprogram(name: "operator+", linkageName: "_ZNK9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEplEl", scope: !357, file: !358, line: 1147, type: !407, scopeLine: 1147, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!407 = !DISubroutineType(types: !408)
!408 = !{!357, !380, !399}
!409 = !DISubprogram(name: "operator-=", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEmIEl", scope: !357, file: !358, line: 1152, type: !404, scopeLine: 1152, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!410 = !DISubprogram(name: "operator-", linkageName: "_ZNK9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEmiEl", scope: !357, file: !358, line: 1157, type: !407, scopeLine: 1157, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!411 = !DISubprogram(name: "base", linkageName: "_ZNK9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEE4baseEv", scope: !357, file: !358, line: 1162, type: !412, scopeLine: 1162, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!412 = !DISubroutineType(types: !413)
!413 = !{!368, !380}
!414 = !{!378, !415}
!415 = !DITemplateTypeParameter(name: "_Container", type: !14)
!416 = !DISubprogram(name: "begin", linkageName: "_ZNKSt6vectorIiSaIiEE5beginEv", scope: !14, file: !2, line: 883, type: !417, scopeLine: 883, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!417 = !DISubroutineType(types: !418)
!418 = !{!419, !476}
!419 = !DIDerivedType(tag: DW_TAG_typedef, name: "const_iterator", scope: !14, file: !2, line: 460, baseType: !420, flags: DIFlagPublic)
!420 = distinct !DICompositeType(tag: DW_TAG_class_type, name: "__normal_iterator<const int *, std::vector<int, std::allocator<int> > >", scope: !29, file: !358, line: 1047, size: 64, flags: DIFlagTypePassByValue | DIFlagNonTrivial, elements: !421, templateParams: !475, identifier: "_ZTSN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEE")
!421 = !{!422, !425, !429, !434, !445, !450, !454, !457, !458, !459, !464, !467, !470, !471, !472}
!422 = !DIDerivedType(tag: DW_TAG_member, name: "_M_current", scope: !420, file: !358, line: 1050, baseType: !423, size: 64, flags: DIFlagProtected)
!423 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !424, size: 64)
!424 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !40)
!425 = !DISubprogram(name: "__normal_iterator", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEC4Ev", scope: !420, file: !358, line: 1072, type: !426, scopeLine: 1072, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!426 = !DISubroutineType(types: !427)
!427 = !{null, !428}
!428 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !420, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!429 = !DISubprogram(name: "__normal_iterator", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEC4ERKS2_", scope: !420, file: !358, line: 1076, type: !430, scopeLine: 1076, flags: DIFlagPublic | DIFlagExplicit | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!430 = !DISubroutineType(types: !431)
!431 = !{null, !428, !432}
!432 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !433, size: 64)
!433 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !423)
!434 = !DISubprogram(name: "operator*", linkageName: "_ZNK9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEdeEv", scope: !420, file: !358, line: 1099, type: !435, scopeLine: 1099, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!435 = !DISubroutineType(types: !436)
!436 = !{!437, !443}
!437 = !DIDerivedType(tag: DW_TAG_typedef, name: "reference", scope: !420, file: !358, line: 1065, baseType: !438, flags: DIFlagPublic)
!438 = !DIDerivedType(tag: DW_TAG_typedef, name: "reference", scope: !439, file: !375, line: 205, baseType: !442)
!439 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "iterator_traits<const int *>", scope: !15, file: !375, line: 198, size: 8, flags: DIFlagTypePassByValue, elements: !138, templateParams: !440, identifier: "_ZTSSt15iterator_traitsIPKiE")
!440 = !{!441}
!441 = !DITemplateTypeParameter(name: "_Iterator", type: !423)
!442 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !424, size: 64)
!443 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !444, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!444 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !420)
!445 = !DISubprogram(name: "operator->", linkageName: "_ZNK9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEptEv", scope: !420, file: !358, line: 1104, type: !446, scopeLine: 1104, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!446 = !DISubroutineType(types: !447)
!447 = !{!448, !443}
!448 = !DIDerivedType(tag: DW_TAG_typedef, name: "pointer", scope: !420, file: !358, line: 1066, baseType: !449, flags: DIFlagPublic)
!449 = !DIDerivedType(tag: DW_TAG_typedef, name: "pointer", scope: !439, file: !375, line: 204, baseType: !423)
!450 = !DISubprogram(name: "operator++", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEppEv", scope: !420, file: !358, line: 1109, type: !451, scopeLine: 1109, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!451 = !DISubroutineType(types: !452)
!452 = !{!453, !428}
!453 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !420, size: 64)
!454 = !DISubprogram(name: "operator++", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEppEi", scope: !420, file: !358, line: 1117, type: !455, scopeLine: 1117, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!455 = !DISubroutineType(types: !456)
!456 = !{!420, !428, !40}
!457 = !DISubprogram(name: "operator--", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEmmEv", scope: !420, file: !358, line: 1123, type: !451, scopeLine: 1123, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!458 = !DISubprogram(name: "operator--", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEmmEi", scope: !420, file: !358, line: 1131, type: !455, scopeLine: 1131, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!459 = !DISubprogram(name: "operator[]", linkageName: "_ZNK9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEixEl", scope: !420, file: !358, line: 1137, type: !460, scopeLine: 1137, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!460 = !DISubroutineType(types: !461)
!461 = !{!437, !443, !462}
!462 = !DIDerivedType(tag: DW_TAG_typedef, name: "difference_type", scope: !420, file: !358, line: 1064, baseType: !463, flags: DIFlagPublic)
!463 = !DIDerivedType(tag: DW_TAG_typedef, name: "difference_type", scope: !439, file: !375, line: 203, baseType: !401)
!464 = !DISubprogram(name: "operator+=", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEpLEl", scope: !420, file: !358, line: 1142, type: !465, scopeLine: 1142, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!465 = !DISubroutineType(types: !466)
!466 = !{!453, !428, !462}
!467 = !DISubprogram(name: "operator+", linkageName: "_ZNK9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEplEl", scope: !420, file: !358, line: 1147, type: !468, scopeLine: 1147, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!468 = !DISubroutineType(types: !469)
!469 = !{!420, !443, !462}
!470 = !DISubprogram(name: "operator-=", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEmIEl", scope: !420, file: !358, line: 1152, type: !465, scopeLine: 1152, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!471 = !DISubprogram(name: "operator-", linkageName: "_ZNK9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEmiEl", scope: !420, file: !358, line: 1157, type: !468, scopeLine: 1157, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!472 = !DISubprogram(name: "base", linkageName: "_ZNK9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEE4baseEv", scope: !420, file: !358, line: 1162, type: !473, scopeLine: 1162, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!473 = !DISubroutineType(types: !474)
!474 = !{!432, !443}
!475 = !{!441, !415}
!476 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !307, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!477 = !DISubprogram(name: "end", linkageName: "_ZNSt6vectorIiSaIiEE3endEv", scope: !14, file: !2, line: 893, type: !354, scopeLine: 893, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!478 = !DISubprogram(name: "end", linkageName: "_ZNKSt6vectorIiSaIiEE3endEv", scope: !14, file: !2, line: 903, type: !417, scopeLine: 903, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!479 = !DISubprogram(name: "rbegin", linkageName: "_ZNSt6vectorIiSaIiEE6rbeginEv", scope: !14, file: !2, line: 913, type: !480, scopeLine: 913, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!480 = !DISubroutineType(types: !481)
!481 = !{!482, !286}
!482 = !DIDerivedType(tag: DW_TAG_typedef, name: "reverse_iterator", scope: !14, file: !2, line: 462, baseType: !483, flags: DIFlagPublic)
!483 = !DICompositeType(tag: DW_TAG_class_type, name: "reverse_iterator<__gnu_cxx::__normal_iterator<int *, std::vector<int, std::allocator<int> > > >", scope: !15, file: !358, line: 136, flags: DIFlagFwdDecl | DIFlagNonTrivial, identifier: "_ZTSSt16reverse_iteratorIN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEEE")
!484 = !DISubprogram(name: "rbegin", linkageName: "_ZNKSt6vectorIiSaIiEE6rbeginEv", scope: !14, file: !2, line: 923, type: !485, scopeLine: 923, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!485 = !DISubroutineType(types: !486)
!486 = !{!487, !476}
!487 = !DIDerivedType(tag: DW_TAG_typedef, name: "const_reverse_iterator", scope: !14, file: !2, line: 461, baseType: !488, flags: DIFlagPublic)
!488 = !DICompositeType(tag: DW_TAG_class_type, name: "reverse_iterator<__gnu_cxx::__normal_iterator<const int *, std::vector<int, std::allocator<int> > > >", scope: !15, file: !358, line: 136, flags: DIFlagFwdDecl | DIFlagNonTrivial, identifier: "_ZTSSt16reverse_iteratorIN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEE")
!489 = !DISubprogram(name: "rend", linkageName: "_ZNSt6vectorIiSaIiEE4rendEv", scope: !14, file: !2, line: 933, type: !480, scopeLine: 933, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!490 = !DISubprogram(name: "rend", linkageName: "_ZNKSt6vectorIiSaIiEE4rendEv", scope: !14, file: !2, line: 943, type: !485, scopeLine: 943, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!491 = !DISubprogram(name: "cbegin", linkageName: "_ZNKSt6vectorIiSaIiEE6cbeginEv", scope: !14, file: !2, line: 954, type: !417, scopeLine: 954, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!492 = !DISubprogram(name: "cend", linkageName: "_ZNKSt6vectorIiSaIiEE4cendEv", scope: !14, file: !2, line: 964, type: !417, scopeLine: 964, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!493 = !DISubprogram(name: "crbegin", linkageName: "_ZNKSt6vectorIiSaIiEE7crbeginEv", scope: !14, file: !2, line: 974, type: !485, scopeLine: 974, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!494 = !DISubprogram(name: "crend", linkageName: "_ZNKSt6vectorIiSaIiEE5crendEv", scope: !14, file: !2, line: 984, type: !485, scopeLine: 984, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!495 = !DISubprogram(name: "size", linkageName: "_ZNKSt6vectorIiSaIiEE4sizeEv", scope: !14, file: !2, line: 992, type: !496, scopeLine: 992, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!496 = !DISubroutineType(types: !497)
!497 = !{!296, !476}
!498 = !DISubprogram(name: "max_size", linkageName: "_ZNKSt6vectorIiSaIiEE8max_sizeEv", scope: !14, file: !2, line: 998, type: !496, scopeLine: 998, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!499 = !DISubprogram(name: "resize", linkageName: "_ZNSt6vectorIiSaIiEE6resizeEm", scope: !14, file: !2, line: 1013, type: !500, scopeLine: 1013, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!500 = !DISubroutineType(types: !501)
!501 = !{null, !286, !296}
!502 = !DISubprogram(name: "resize", linkageName: "_ZNSt6vectorIiSaIiEE6resizeEmRKi", scope: !14, file: !2, line: 1034, type: !348, scopeLine: 1034, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!503 = !DISubprogram(name: "shrink_to_fit", linkageName: "_ZNSt6vectorIiSaIiEE13shrink_to_fitEv", scope: !14, file: !2, line: 1068, type: !284, scopeLine: 1068, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!504 = !DISubprogram(name: "capacity", linkageName: "_ZNKSt6vectorIiSaIiEE8capacityEv", scope: !14, file: !2, line: 1078, type: !496, scopeLine: 1078, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!505 = !DISubprogram(name: "empty", linkageName: "_ZNKSt6vectorIiSaIiEE5emptyEv", scope: !14, file: !2, line: 1088, type: !506, scopeLine: 1088, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!506 = !DISubroutineType(types: !507)
!507 = !{!131, !476}
!508 = !DISubprogram(name: "reserve", linkageName: "_ZNSt6vectorIiSaIiEE7reserveEm", scope: !14, file: !2, line: 1110, type: !500, scopeLine: 1110, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!509 = !DISubprogram(name: "operator[]", linkageName: "_ZNSt6vectorIiSaIiEEixEm", scope: !14, file: !2, line: 1126, type: !510, scopeLine: 1126, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!510 = !DISubroutineType(types: !511)
!511 = !{!512, !286, !296}
!512 = !DIDerivedType(tag: DW_TAG_typedef, name: "reference", scope: !14, file: !2, line: 456, baseType: !513, flags: DIFlagPublic)
!513 = !DIDerivedType(tag: DW_TAG_typedef, name: "reference", scope: !28, file: !26, line: 59, baseType: !514)
!514 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !515, size: 64)
!515 = !DIDerivedType(tag: DW_TAG_typedef, name: "value_type", scope: !28, file: !26, line: 53, baseType: !516)
!516 = !DIDerivedType(tag: DW_TAG_typedef, name: "value_type", scope: !32, file: !33, line: 434, baseType: !40)
!517 = !DISubprogram(name: "operator[]", linkageName: "_ZNKSt6vectorIiSaIiEEixEm", scope: !14, file: !2, line: 1145, type: !518, scopeLine: 1145, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!518 = !DISubroutineType(types: !519)
!519 = !{!520, !476, !296}
!520 = !DIDerivedType(tag: DW_TAG_typedef, name: "const_reference", scope: !14, file: !2, line: 457, baseType: !521, flags: DIFlagPublic)
!521 = !DIDerivedType(tag: DW_TAG_typedef, name: "const_reference", scope: !28, file: !26, line: 60, baseType: !522)
!522 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !523, size: 64)
!523 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !515)
!524 = !DISubprogram(name: "_M_range_check", linkageName: "_ZNKSt6vectorIiSaIiEE14_M_range_checkEm", scope: !14, file: !2, line: 1155, type: !525, scopeLine: 1155, flags: DIFlagProtected | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!525 = !DISubroutineType(types: !526)
!526 = !{null, !476, !296}
!527 = !DISubprogram(name: "at", linkageName: "_ZNSt6vectorIiSaIiEE2atEm", scope: !14, file: !2, line: 1178, type: !510, scopeLine: 1178, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!528 = !DISubprogram(name: "at", linkageName: "_ZNKSt6vectorIiSaIiEE2atEm", scope: !14, file: !2, line: 1197, type: !518, scopeLine: 1197, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!529 = !DISubprogram(name: "front", linkageName: "_ZNSt6vectorIiSaIiEE5frontEv", scope: !14, file: !2, line: 1209, type: !530, scopeLine: 1209, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!530 = !DISubroutineType(types: !531)
!531 = !{!512, !286}
!532 = !DISubprogram(name: "front", linkageName: "_ZNKSt6vectorIiSaIiEE5frontEv", scope: !14, file: !2, line: 1221, type: !533, scopeLine: 1221, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!533 = !DISubroutineType(types: !534)
!534 = !{!520, !476}
!535 = !DISubprogram(name: "back", linkageName: "_ZNSt6vectorIiSaIiEE4backEv", scope: !14, file: !2, line: 1233, type: !530, scopeLine: 1233, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!536 = !DISubprogram(name: "back", linkageName: "_ZNKSt6vectorIiSaIiEE4backEv", scope: !14, file: !2, line: 1245, type: !533, scopeLine: 1245, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!537 = !DISubprogram(name: "data", linkageName: "_ZNSt6vectorIiSaIiEE4dataEv", scope: !14, file: !2, line: 1260, type: !538, scopeLine: 1260, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!538 = !DISubroutineType(types: !539)
!539 = !{!39, !286}
!540 = !DISubprogram(name: "data", linkageName: "_ZNKSt6vectorIiSaIiEE4dataEv", scope: !14, file: !2, line: 1265, type: !541, scopeLine: 1265, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!541 = !DISubroutineType(types: !542)
!542 = !{!423, !476}
!543 = !DISubprogram(name: "push_back", linkageName: "_ZNSt6vectorIiSaIiEE9push_backERKi", scope: !14, file: !2, line: 1281, type: !544, scopeLine: 1281, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!544 = !DISubroutineType(types: !545)
!545 = !{null, !286, !300}
!546 = !DISubprogram(name: "push_back", linkageName: "_ZNSt6vectorIiSaIiEE9push_backEOi", scope: !14, file: !2, line: 1298, type: !547, scopeLine: 1298, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!547 = !DISubroutineType(types: !548)
!548 = !{null, !286, !549}
!549 = !DIDerivedType(tag: DW_TAG_rvalue_reference_type, baseType: !302, size: 64)
!550 = !DISubprogram(name: "pop_back", linkageName: "_ZNSt6vectorIiSaIiEE8pop_backEv", scope: !14, file: !2, line: 1322, type: !284, scopeLine: 1322, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!551 = !DISubprogram(name: "insert", linkageName: "_ZNSt6vectorIiSaIiEE6insertEN9__gnu_cxx17__normal_iteratorIPKiS1_EERS4_", scope: !14, file: !2, line: 1362, type: !552, scopeLine: 1362, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!552 = !DISubroutineType(types: !553)
!553 = !{!356, !286, !419, !300}
!554 = !DISubprogram(name: "insert", linkageName: "_ZNSt6vectorIiSaIiEE6insertEN9__gnu_cxx17__normal_iteratorIPKiS1_EEOi", scope: !14, file: !2, line: 1393, type: !555, scopeLine: 1393, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!555 = !DISubroutineType(types: !556)
!556 = !{!356, !286, !419, !549}
!557 = !DISubprogram(name: "insert", linkageName: "_ZNSt6vectorIiSaIiEE6insertEN9__gnu_cxx17__normal_iteratorIPKiS1_EESt16initializer_listIiE", scope: !14, file: !2, line: 1411, type: !558, scopeLine: 1411, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!558 = !DISubroutineType(types: !559)
!559 = !{!356, !286, !419, !334}
!560 = !DISubprogram(name: "insert", linkageName: "_ZNSt6vectorIiSaIiEE6insertEN9__gnu_cxx17__normal_iteratorIPKiS1_EEmRS4_", scope: !14, file: !2, line: 1437, type: !561, scopeLine: 1437, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!561 = !DISubroutineType(types: !562)
!562 = !{!356, !286, !419, !296, !300}
!563 = !DISubprogram(name: "erase", linkageName: "_ZNSt6vectorIiSaIiEE5eraseEN9__gnu_cxx17__normal_iteratorIPKiS1_EE", scope: !14, file: !2, line: 1534, type: !564, scopeLine: 1534, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!564 = !DISubroutineType(types: !565)
!565 = !{!356, !286, !419}
!566 = !DISubprogram(name: "erase", linkageName: "_ZNSt6vectorIiSaIiEE5eraseEN9__gnu_cxx17__normal_iteratorIPKiS1_EES6_", scope: !14, file: !2, line: 1562, type: !567, scopeLine: 1562, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!567 = !DISubroutineType(types: !568)
!568 = !{!356, !286, !419, !419}
!569 = !DISubprogram(name: "swap", linkageName: "_ZNSt6vectorIiSaIiEE4swapERS1_", scope: !14, file: !2, line: 1586, type: !570, scopeLine: 1586, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!570 = !DISubroutineType(types: !571)
!571 = !{null, !286, !340}
!572 = !DISubprogram(name: "clear", linkageName: "_ZNSt6vectorIiSaIiEE5clearEv", scope: !14, file: !2, line: 1605, type: !284, scopeLine: 1605, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!573 = !DISubprogram(name: "_M_fill_initialize", linkageName: "_ZNSt6vectorIiSaIiEE18_M_fill_initializeEmRKi", scope: !14, file: !2, line: 1704, type: !348, scopeLine: 1704, flags: DIFlagProtected | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!574 = !DISubprogram(name: "_M_default_initialize", linkageName: "_ZNSt6vectorIiSaIiEE21_M_default_initializeEm", scope: !14, file: !2, line: 1715, type: !500, scopeLine: 1715, flags: DIFlagProtected | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!575 = !DISubprogram(name: "_M_fill_assign", linkageName: "_ZNSt6vectorIiSaIiEE14_M_fill_assignEmRKi", scope: !14, file: !2, line: 1762, type: !348, scopeLine: 1762, flags: DIFlagProtected | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!576 = !DISubprogram(name: "_M_fill_insert", linkageName: "_ZNSt6vectorIiSaIiEE14_M_fill_insertEN9__gnu_cxx17__normal_iteratorIPiS1_EEmRKi", scope: !14, file: !2, line: 1806, type: !577, scopeLine: 1806, flags: DIFlagProtected | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!577 = !DISubroutineType(types: !578)
!578 = !{null, !286, !356, !296, !300}
!579 = !DISubprogram(name: "_M_default_append", linkageName: "_ZNSt6vectorIiSaIiEE17_M_default_appendEm", scope: !14, file: !2, line: 1812, type: !500, scopeLine: 1812, flags: DIFlagProtected | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!580 = !DISubprogram(name: "_M_shrink_to_fit", linkageName: "_ZNSt6vectorIiSaIiEE16_M_shrink_to_fitEv", scope: !14, file: !2, line: 1816, type: !581, scopeLine: 1816, flags: DIFlagProtected | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!581 = !DISubroutineType(types: !582)
!582 = !{!131, !286}
!583 = !DISubprogram(name: "_M_insert_rval", linkageName: "_ZNSt6vectorIiSaIiEE14_M_insert_rvalEN9__gnu_cxx17__normal_iteratorIPKiS1_EEOi", scope: !14, file: !2, line: 1878, type: !555, scopeLine: 1878, flags: DIFlagProtected | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!584 = !DISubprogram(name: "_M_emplace_aux", linkageName: "_ZNSt6vectorIiSaIiEE14_M_emplace_auxEN9__gnu_cxx17__normal_iteratorIPKiS1_EEOi", scope: !14, file: !2, line: 1889, type: !555, scopeLine: 1889, flags: DIFlagProtected | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!585 = !DISubprogram(name: "_M_check_len", linkageName: "_ZNKSt6vectorIiSaIiEE12_M_check_lenEmPKc", scope: !14, file: !2, line: 1896, type: !586, scopeLine: 1896, flags: DIFlagProtected | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!586 = !DISubroutineType(types: !587)
!587 = !{!296, !476, !296, !588}
!588 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !4, size: 64)
!589 = !DISubprogram(name: "_S_check_init_len", linkageName: "_ZNSt6vectorIiSaIiEE17_S_check_init_lenEmRKS0_", scope: !14, file: !2, line: 1907, type: !590, scopeLine: 1907, flags: DIFlagProtected | DIFlagPrototyped | DIFlagStaticMember, spFlags: DISPFlagOptimized)
!590 = !DISubroutineType(types: !591)
!591 = !{!296, !296, !290}
!592 = !DISubprogram(name: "_S_max_size", linkageName: "_ZNSt6vectorIiSaIiEE11_S_max_sizeERKS0_", scope: !14, file: !2, line: 1916, type: !593, scopeLine: 1916, flags: DIFlagProtected | DIFlagPrototyped | DIFlagStaticMember, spFlags: DISPFlagOptimized)
!593 = !DISubroutineType(types: !594)
!594 = !{!296, !595}
!595 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !596, size: 64)
!596 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !276)
!597 = !DISubprogram(name: "_M_erase_at_end", linkageName: "_ZNSt6vectorIiSaIiEE15_M_erase_at_endEPi", scope: !14, file: !2, line: 1933, type: !598, scopeLine: 1933, flags: DIFlagProtected | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!598 = !DISubroutineType(types: !599)
!599 = !{null, !286, !274}
!600 = !DISubprogram(name: "_M_erase", linkageName: "_ZNSt6vectorIiSaIiEE8_M_eraseEN9__gnu_cxx17__normal_iteratorIPiS1_EE", scope: !14, file: !2, line: 1946, type: !601, scopeLine: 1946, flags: DIFlagProtected | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!601 = !DISubroutineType(types: !602)
!602 = !{!356, !286, !356}
!603 = !DISubprogram(name: "_M_erase", linkageName: "_ZNSt6vectorIiSaIiEE8_M_eraseEN9__gnu_cxx17__normal_iteratorIPiS1_EES5_", scope: !14, file: !2, line: 1950, type: !604, scopeLine: 1950, flags: DIFlagProtected | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!604 = !DISubroutineType(types: !605)
!605 = !{!356, !286, !356, !356}
!606 = !DISubprogram(name: "_M_move_assign", linkageName: "_ZNSt6vectorIiSaIiEE14_M_move_assignEOS1_St17integral_constantIbLb1EE", scope: !14, file: !2, line: 1959, type: !607, scopeLine: 1959, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!607 = !DISubroutineType(types: !608)
!608 = !{null, !286, !311, !238}
!609 = !DISubprogram(name: "_M_move_assign", linkageName: "_ZNSt6vectorIiSaIiEE14_M_move_assignEOS1_St17integral_constantIbLb0EE", scope: !14, file: !2, line: 1971, type: !610, scopeLine: 1971, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!610 = !DISubroutineType(types: !611)
!611 = !{null, !286, !311, !257}
!612 = !{!82, !613}
!613 = !DITemplateTypeParameter(name: "_Alloc", type: !43, defaulted: true)
!614 = !DIDerivedType(tag: DW_TAG_member, name: "bucket", scope: !11, file: !9, line: 14, baseType: !615, size: 64, offset: 192)
!615 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "Bucket", file: !9, line: 7, size: 64, flags: DIFlagTypePassByValue | DIFlagNonTrivial, elements: !616, identifier: "_ZTS6Bucket")
!616 = !{!617, !618}
!617 = !DIDerivedType(tag: DW_TAG_member, name: "hits", scope: !615, file: !9, line: 8, baseType: !40, size: 32)
!618 = !DIDerivedType(tag: DW_TAG_member, name: "misses", scope: !615, file: !9, line: 9, baseType: !40, size: 32, offset: 32)
!619 = !DIDerivedType(tag: DW_TAG_member, name: "handle", scope: !11, file: !9, line: 15, baseType: !39, size: 64, offset: 256)
!620 = !DIDerivedType(tag: DW_TAG_typedef, name: "size_t", file: !621, line: 18, baseType: !71)
!621 = !DIFile(filename: "/usr/lib/llvm-23/lib/clang/23/include/__stddef_size_t.h", directory: "", checksumkind: CSK_MD5, checksum: "2c44e821a2b1951cde2eb0fb2e656867")
!622 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: null, size: 64)
!623 = !{!0}
!624 = !{!625, !629}
!625 = !DIImportedEntity(tag: DW_TAG_imported_module, scope: !626, entity: !627, file: !628, line: 58)
!626 = !DINamespace(name: "__gnu_debug", scope: null)
!627 = !DINamespace(name: "__debug", scope: !15)
!628 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/debug/debug.h", directory: "", checksumkind: CSK_MD5, checksum: "752210a319f5f5d356cc29cd1ce3cdc7")
!629 = !DIImportedEntity(tag: DW_TAG_imported_declaration, scope: !15, entity: !630, file: !638, line: 58)
!630 = !DIDerivedType(tag: DW_TAG_typedef, name: "max_align_t", file: !631, line: 24, baseType: !632)
!631 = !DIFile(filename: "/usr/lib/llvm-23/lib/clang/23/include/__stddef_max_align_t.h", directory: "", checksumkind: CSK_MD5, checksum: "3c0a2f19d136d39aa835c737c7105def")
!632 = distinct !DICompositeType(tag: DW_TAG_structure_type, file: !631, line: 19, size: 256, flags: DIFlagTypePassByValue, elements: !633, identifier: "_ZTS11max_align_t")
!633 = !{!634, !636}
!634 = !DIDerivedType(tag: DW_TAG_member, name: "__clang_max_align_nonce1", scope: !632, file: !631, line: 20, baseType: !635, size: 64, align: 64)
!635 = !DIBasicType(name: "long long", size: 64, encoding: DW_ATE_signed)
!636 = !DIDerivedType(tag: DW_TAG_member, name: "__clang_max_align_nonce2", scope: !632, file: !631, line: 22, baseType: !637, size: 128, align: 128, offset: 128)
!637 = !DIBasicType(name: "long double", size: 128, encoding: DW_ATE_float)
!638 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/cstddef", directory: "")
!639 = !{i32 7, !"Dwarf Version", i32 5}
!640 = !{i32 2, !"Debug Info Version", i32 3}
!641 = !{i32 8, !"PIC Level", i32 2}
!642 = !{i32 7, !"PIE Level", i32 2}
!643 = !{i32 7, !"uwtable", i32 2}
!644 = !{i32 7, !"debug-info-assignment-tracking", i1 true}
!645 = !{!"Ubuntu clang version 23.1.4 (++20261018124056+71c76755a8ff-1~exp1~20261018124211.83)"}
!646 = !{!647, !648, i64 0}
!647 = !{!"__libc_errno", !648, i64 0}
!648 = !{!"int", !649, i64 0}
!649 = !{!"omnipotent char", !650, i64 0}
!650 = !{!"Simple C++ TBAA"}
!651 = distinct !DISubprogram(name: "carry", linkageName: "_Z5carry3Box", scope: !9, file: !9, line: 23, type: !652, scopeLine: 23, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, retainedNodes: !654, keyInstructions: true)
!652 = !DISubroutineType(types: !653)
!653 = !{!11, !11}
!654 = !{!655}
!655 = !DILocalVariable(name: "box", arg: 1, scope: !651, file: !9, line: 23, type: !11)
!656 = !DILocation(line: 0, scope: !651)
!657 = !DILocation(line: 24, column: 7, scope: !651)
!658 = !DILocation(line: 24, column: 19, scope: !651)
!659 = !{!660, !648, i64 24}
!660 = !{!"_ZTS3Box", !661, i64 0, !667, i64 24, !665, i64 32}
!661 = !{!"_ZTSSt6vectorIiSaIiEE", !662, i64 0}
!662 = !{!"_ZTSSt12_Vector_baseIiSaIiEE", !663, i64 0}
!663 = !{!"_ZTSNSt12_Vector_baseIiSaIiEE12_Vector_implE", !664, i64 0}
!664 = !{!"_ZTSNSt12_Vector_baseIiSaIiEE17_Vector_impl_dataE", !665, i64 0, !665, i64 8, !665, i64 16}
!665 = !{!"p1 int", !666, i64 0}
!666 = !{!"any pointer", !649, i64 0}
!667 = !{!"_ZTS6Bucket", !648, i64 0, !648, i64 4}
!668 = !DILocation(line: 24, column: 19, scope: !651, atomGroup: 1, atomRank: 2)
!669 = !DILocation(line: 24, column: 19, scope: !651, atomGroup: 1, atomRank: 1)
!670 = !DILocalVariable(name: "this", arg: 1, scope: !671, type: !679, flags: DIFlagArtificial | DIFlagObjectPointer)
!671 = distinct !DISubprogram(name: "Box", linkageName: "_ZN3BoxC2EOS_", scope: !11, file: !9, line: 12, type: !672, scopeLine: 12, flags: DIFlagArtificial | DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, declaration: !676, retainedNodes: !677, keyInstructions: true)
!672 = !DISubroutineType(types: !673)
!673 = !{null, !674, !675}
!674 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !11, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!675 = !DIDerivedType(tag: DW_TAG_rvalue_reference_type, baseType: !11, size: 64)
!676 = !DISubprogram(name: "Box", linkageName: "_ZN3BoxC4EOS_", scope: !11, type: !672, flags: DIFlagArtificial | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!677 = !{!670, !678}
!678 = !DILocalVariable(arg: 2, scope: !671, type: !675, flags: DIFlagArtificial)
!679 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !11, size: 64)
!680 = !DILocation(line: 0, scope: !671, inlinedAt: !681)
!681 = distinct !DILocation(line: 25, column: 10, scope: !651)
!682 = !DILocalVariable(name: "this", arg: 1, scope: !683, type: !686, flags: DIFlagArtificial | DIFlagObjectPointer)
!683 = distinct !DISubprogram(name: "vector", linkageName: "_ZNSt6vectorIiSaIiEEC2EOS1_", scope: !14, file: !2, line: 620, type: !309, scopeLine: 620, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, declaration: !308, retainedNodes: !684, keyInstructions: true)
!684 = !{!682, !685}
!685 = !DILocalVariable(arg: 2, scope: !683, file: !2, line: 620, type: !311)
!686 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !14, size: 64)
!687 = !DILocation(line: 0, scope: !683, inlinedAt: !688)
!688 = distinct !DILocation(line: 12, column: 8, scope: !671, inlinedAt: !681)
!689 = !DILocalVariable(name: "this", arg: 1, scope: !690, type: !693, flags: DIFlagArtificial | DIFlagObjectPointer)
!690 = distinct !DISubprogram(name: "_Vector_base", linkageName: "_ZNSt12_Vector_baseIiSaIiEEC2EOS1_", scope: !18, file: !2, line: 338, type: !214, scopeLine: 338, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, declaration: !213, retainedNodes: !691, keyInstructions: true)
!691 = !{!689, !692}
!692 = !DILocalVariable(arg: 2, scope: !690, file: !2, line: 338, type: !216)
!693 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !18, size: 64)
!694 = !DILocation(line: 0, scope: !690, inlinedAt: !695)
!695 = distinct !DILocation(line: 620, column: 7, scope: !683, inlinedAt: !688)
!696 = !DILocalVariable(name: "this", arg: 1, scope: !697, type: !700, flags: DIFlagArtificial | DIFlagObjectPointer)
!697 = distinct !DISubprogram(name: "_Vector_impl", linkageName: "_ZNSt12_Vector_baseIiSaIiEE12_Vector_implC2EOS2_", scope: !21, file: !2, line: 154, type: !175, scopeLine: 156, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, declaration: !174, retainedNodes: !698, keyInstructions: true)
!698 = !{!696, !699}
!699 = !DILocalVariable(name: "__x", arg: 2, scope: !697, file: !2, line: 154, type: !177)
!700 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !21, size: 64)
!701 = !DILocation(line: 0, scope: !697, inlinedAt: !702)
!702 = distinct !DILocation(line: 338, column: 7, scope: !690, inlinedAt: !695)
!703 = !DILocalVariable(name: "this", arg: 1, scope: !704, type: !707, flags: DIFlagArtificial | DIFlagObjectPointer)
!704 = distinct !DISubprogram(name: "_Vector_impl_data", linkageName: "_ZNSt12_Vector_baseIiSaIiEE17_Vector_impl_dataC2EOS2_", scope: !141, file: !2, line: 105, type: !153, scopeLine: 108, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, declaration: !152, retainedNodes: !705, keyInstructions: true)
!705 = !{!703, !706}
!706 = !DILocalVariable(name: "__x", arg: 2, scope: !704, file: !2, line: 105, type: !155)
!707 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !141, size: 64)
!708 = !DILocation(line: 0, scope: !704, inlinedAt: !709)
!709 = distinct !DILocation(line: 155, column: 36, scope: !697, inlinedAt: !702)
!710 = !DILocation(line: 106, column: 17, scope: !704, inlinedAt: !709, atomGroup: 1, atomRank: 2)
!711 = !{!665, !665, i64 0}
!712 = !DILocation(line: 106, column: 4, scope: !704, inlinedAt: !709, atomGroup: 1, atomRank: 1)
!713 = !DILocation(line: 107, column: 4, scope: !704, inlinedAt: !709)
!714 = !DILocation(line: 107, column: 26, scope: !704, inlinedAt: !709)
!715 = !DILocation(line: 107, column: 26, scope: !704, inlinedAt: !709, atomGroup: 3, atomRank: 2)
!716 = !{!664, !665, i64 16}
!717 = !DILocation(line: 107, column: 4, scope: !704, inlinedAt: !709, atomGroup: 3, atomRank: 1)
!718 = !DILocation(line: 108, column: 33, scope: !719, inlinedAt: !709, atomGroup: 5, atomRank: 1)
!719 = distinct !DILexicalBlock(scope: !704, file: !2, line: 108, column: 2)
!720 = !DILocation(line: 12, column: 8, scope: !671, inlinedAt: !681)
!721 = !DILocation(line: 12, column: 8, scope: !671, inlinedAt: !681, atomGroup: 1, atomRank: 1)
!722 = !DILocation(line: 25, column: 3, scope: !651, atomGroup: 2, atomRank: 1)
!723 = distinct !DISubprogram(name: "advance", linkageName: "_Z7advance3Envi", scope: !9, file: !9, line: 28, type: !724, scopeLine: 28, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, retainedNodes: !730, keyInstructions: true)
!724 = !DISubroutineType(types: !725)
!725 = !{!40, !726, !40}
!726 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "Env", file: !9, line: 18, size: 384, flags: DIFlagTypePassByReference | DIFlagNonTrivial, elements: !727, identifier: "_ZTS3Env")
!727 = !{!728, !729}
!728 = !DIDerivedType(tag: DW_TAG_member, name: "epoch", scope: !726, file: !9, line: 19, baseType: !40, size: 32)
!729 = !DIDerivedType(tag: DW_TAG_member, name: "box", scope: !726, file: !9, line: 20, baseType: !11, size: 320, offset: 64)
!730 = !{!731, !732, !733, !734, !735, !736, !737}
!731 = !DILocalVariable(name: "env", arg: 1, scope: !723, file: !9, line: 28, type: !726)
!732 = !DILocalVariable(name: "n", arg: 2, scope: !723, file: !9, line: 28, type: !40)
!733 = !DILocalVariable(name: "box", scope: !723, file: !9, line: 29, type: !11)
!734 = !DILocalVariable(name: "layers", scope: !723, file: !9, line: 30, type: !14)
!735 = !DILocalVariable(name: "result", scope: !723, file: !9, line: 32, type: !11)
!736 = !DILocalVariable(name: "next", scope: !723, file: !9, line: 42, type: !11)
!737 = distinct !DICompositeType(tag: DW_TAG_class_type, scope: !723, file: !9, line: 34, size: 8, flags: DIFlagTypePassByValue, elements: !138)
!738 = !DILocalVariable(name: "this", arg: 1, scope: !739, type: !743, flags: DIFlagArtificial | DIFlagObjectPointer)
!739 = distinct !DISubprogram(name: "deallocate", linkageName: "_ZNSt15__new_allocatorIiE10deallocateEPim", scope: !49, file: !50, line: 156, type: !75, scopeLine: 157, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, declaration: !74, retainedNodes: !740, keyInstructions: true)
!740 = !{!738, !741, !742}
!741 = !DILocalVariable(name: "__p", arg: 2, scope: !739, file: !50, line: 156, type: !39)
!742 = !DILocalVariable(name: "__n", arg: 3, scope: !739, file: !50, line: 156, type: !68)
!743 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !49, size: 64)
!744 = !DILocation(line: 0, scope: !739, inlinedAt: !745)
!745 = distinct !DILocation(line: 210, column: 25, scope: !746, inlinedAt: !752)
!746 = distinct !DISubprogram(name: "deallocate", linkageName: "_ZNSaIiE10deallocateEPim", scope: !43, file: !44, line: 203, type: !101, scopeLine: 204, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, declaration: !100, retainedNodes: !747, keyInstructions: true)
!747 = !{!748, !750, !751}
!748 = !DILocalVariable(name: "this", arg: 1, scope: !746, type: !749, flags: DIFlagArtificial | DIFlagObjectPointer)
!749 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !43, size: 64)
!750 = !DILocalVariable(name: "__p", arg: 2, scope: !746, file: !44, line: 203, type: !39)
!751 = !DILocalVariable(name: "__n", arg: 3, scope: !746, file: !44, line: 203, type: !69)
!752 = distinct !DILocation(line: 517, column: 13, scope: !753, inlinedAt: !758)
!753 = distinct !DISubprogram(name: "deallocate", linkageName: "_ZNSt16allocator_traitsISaIiEE10deallocateERS0_Pim", scope: !32, file: !33, line: 516, type: !109, scopeLine: 517, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, declaration: !108, retainedNodes: !754, keyInstructions: true)
!754 = !{!755, !756, !757}
!755 = !DILocalVariable(name: "__a", arg: 1, scope: !753, file: !33, line: 516, type: !41)
!756 = !DILocalVariable(name: "__p", arg: 2, scope: !753, file: !33, line: 516, type: !38)
!757 = !DILocalVariable(name: "__n", arg: 3, scope: !753, file: !33, line: 516, type: !103)
!758 = distinct !DILocation(line: 390, column: 4, scope: !759, inlinedAt: !765)
!759 = distinct !DILexicalBlock(scope: !760, file: !2, line: 389, column: 6)
!760 = distinct !DISubprogram(name: "_M_deallocate", linkageName: "_ZNSt12_Vector_baseIiSaIiEE13_M_deallocateEPim", scope: !18, file: !2, line: 386, type: !231, scopeLine: 387, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, declaration: !230, retainedNodes: !761, keyInstructions: true)
!761 = !{!762, !763, !764}
!762 = !DILocalVariable(name: "this", arg: 1, scope: !760, type: !693, flags: DIFlagArtificial | DIFlagObjectPointer)
!763 = !DILocalVariable(name: "__p", arg: 2, scope: !760, file: !2, line: 386, type: !144)
!764 = !DILocalVariable(name: "__n", arg: 3, scope: !760, file: !2, line: 386, type: !69)
!765 = distinct !DILocation(line: 369, column: 2, scope: !766, inlinedAt: !770)
!766 = distinct !DILexicalBlock(scope: !767, file: !2, line: 368, column: 7)
!767 = distinct !DISubprogram(name: "~_Vector_base", linkageName: "_ZNSt12_Vector_baseIiSaIiEED2Ev", scope: !18, file: !2, line: 367, type: !200, scopeLine: 368, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, declaration: !226, retainedNodes: !768, keyInstructions: true)
!768 = !{!769}
!769 = !DILocalVariable(name: "this", arg: 1, scope: !767, type: !693, flags: DIFlagArtificial | DIFlagObjectPointer)
!770 = distinct !DILocation(line: 738, column: 7, scope: !771, inlinedAt: !775)
!771 = distinct !DILexicalBlock(scope: !772, file: !2, line: 734, column: 7)
!772 = distinct !DISubprogram(name: "~vector", linkageName: "_ZNSt6vectorIiSaIiEED2Ev", scope: !14, file: !2, line: 733, type: !284, scopeLine: 734, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, declaration: !336, retainedNodes: !773, keyInstructions: true)
!773 = !{!774}
!774 = !DILocalVariable(name: "this", arg: 1, scope: !772, type: !686, flags: DIFlagArtificial | DIFlagObjectPointer)
!775 = distinct !DILocation(line: 12, column: 8, scope: !776, inlinedAt: !783)
!776 = distinct !DILexicalBlock(scope: !777, file: !9, line: 12, column: 8)
!777 = distinct !DISubprogram(name: "~Box", linkageName: "_ZN3BoxD2Ev", scope: !11, file: !9, line: 12, type: !778, scopeLine: 12, flags: DIFlagArtificial | DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, declaration: !780, retainedNodes: !781, keyInstructions: true)
!778 = !DISubroutineType(types: !779)
!779 = !{null, !674}
!780 = !DISubprogram(name: "~Box", linkageName: "_ZN3BoxD4Ev", scope: !11, type: !778, flags: DIFlagArtificial | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!781 = !{!782}
!782 = !DILocalVariable(name: "this", arg: 1, scope: !777, type: !679, flags: DIFlagArtificial | DIFlagObjectPointer)
!783 = distinct !DILocation(line: 45, column: 1, scope: !723)
!784 = !DILocation(line: 0, scope: !746, inlinedAt: !752)
!785 = !DILocation(line: 0, scope: !753, inlinedAt: !758)
!786 = !DILocation(line: 0, scope: !760, inlinedAt: !765)
!787 = !DILocation(line: 0, scope: !767, inlinedAt: !770)
!788 = !DILocation(line: 0, scope: !772, inlinedAt: !775)
!789 = !DILocation(line: 0, scope: !777, inlinedAt: !783)
!790 = !DILocation(line: 0, scope: !739, inlinedAt: !791)
!791 = distinct !DILocation(line: 210, column: 25, scope: !746, inlinedAt: !792)
!792 = distinct !DILocation(line: 517, column: 13, scope: !753, inlinedAt: !793)
!793 = distinct !DILocation(line: 390, column: 4, scope: !759, inlinedAt: !794)
!794 = distinct !DILocation(line: 369, column: 2, scope: !766, inlinedAt: !795)
!795 = distinct !DILocation(line: 738, column: 7, scope: !771, inlinedAt: !796)
!796 = distinct !DILocation(line: 12, column: 8, scope: !776, inlinedAt: !797)
!797 = distinct !DILocation(line: 45, column: 1, scope: !723)
!798 = !DILocation(line: 0, scope: !746, inlinedAt: !792)
!799 = !DILocation(line: 0, scope: !753, inlinedAt: !793)
!800 = !DILocation(line: 0, scope: !760, inlinedAt: !794)
!801 = !DILocation(line: 0, scope: !767, inlinedAt: !795)
!802 = !DILocation(line: 0, scope: !772, inlinedAt: !796)
!803 = !DILocation(line: 0, scope: !777, inlinedAt: !797)
!804 = !DILocalVariable(name: "this", arg: 1, scope: !805, type: !807, flags: DIFlagArtificial | DIFlagObjectPointer)
!805 = distinct !DISubprogram(name: "size", linkageName: "_ZNKSt6vectorIiSaIiEE4sizeEv", scope: !14, file: !2, line: 992, type: !496, scopeLine: 993, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, declaration: !495, retainedNodes: !806, keyInstructions: true)
!806 = !{!804}
!807 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !307, size: 64)
!808 = !DILocation(line: 0, scope: !805, inlinedAt: !809)
!809 = distinct !DILocation(line: 602, column: 19, scope: !810, inlinedAt: !814)
!810 = distinct !DISubprogram(name: "vector", linkageName: "_ZNSt6vectorIiSaIiEEC2ERKS1_", scope: !14, file: !2, line: 601, type: !304, scopeLine: 604, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, declaration: !303, retainedNodes: !811, keyInstructions: true)
!811 = !{!812, !813}
!812 = !DILocalVariable(name: "this", arg: 1, scope: !810, type: !686, flags: DIFlagArtificial | DIFlagObjectPointer)
!813 = !DILocalVariable(name: "__x", arg: 2, scope: !810, file: !2, line: 601, type: !306)
!814 = distinct !DILocation(line: 12, column: 8, scope: !815, inlinedAt: !824)
!815 = distinct !DISubprogram(name: "Box", linkageName: "_ZN3BoxC2ERKS_", scope: !11, file: !9, line: 12, type: !816, scopeLine: 12, flags: DIFlagArtificial | DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, declaration: !820, retainedNodes: !821, keyInstructions: true)
!816 = !DISubroutineType(types: !817)
!817 = !{null, !674, !818}
!818 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !819, size: 64)
!819 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !11)
!820 = !DISubprogram(name: "Box", linkageName: "_ZN3BoxC4ERKS_", scope: !11, type: !816, flags: DIFlagArtificial | DIFlagPrototyped, spFlags: DISPFlagOptimized)
!821 = !{!822, !823}
!822 = !DILocalVariable(name: "this", arg: 1, scope: !815, type: !679, flags: DIFlagArtificial | DIFlagObjectPointer)
!823 = !DILocalVariable(arg: 2, scope: !815, type: !818, flags: DIFlagArtificial)
!824 = distinct !DILocation(line: 33, column: 37, scope: !723)
!825 = !DILocation(line: 0, scope: !810, inlinedAt: !814)
!826 = !DILocation(line: 0, scope: !815, inlinedAt: !824)
!827 = !DILocation(line: 0, scope: !704, inlinedAt: !828)
!828 = distinct !DILocation(line: 155, column: 36, scope: !697, inlinedAt: !829)
!829 = distinct !DILocation(line: 338, column: 7, scope: !690, inlinedAt: !830)
!830 = distinct !DILocation(line: 620, column: 7, scope: !683, inlinedAt: !831)
!831 = distinct !DILocation(line: 29, column: 18, scope: !723)
!832 = !DILocation(line: 0, scope: !697, inlinedAt: !829)
!833 = !DILocation(line: 0, scope: !690, inlinedAt: !830)
!834 = !DILocation(line: 0, scope: !683, inlinedAt: !831)
!835 = !DILocation(line: 0, scope: !739, inlinedAt: !836)
!836 = distinct !DILocation(line: 210, column: 25, scope: !746, inlinedAt: !837)
!837 = distinct !DILocation(line: 517, column: 13, scope: !753, inlinedAt: !838)
!838 = distinct !DILocation(line: 390, column: 4, scope: !759, inlinedAt: !839)
!839 = distinct !DILocation(line: 369, column: 2, scope: !766, inlinedAt: !840)
!840 = distinct !DILocation(line: 738, column: 7, scope: !771, inlinedAt: !841)
!841 = distinct !DILocation(line: 45, column: 1, scope: !723)
!842 = !DILocation(line: 0, scope: !746, inlinedAt: !837)
!843 = !DILocation(line: 0, scope: !753, inlinedAt: !838)
!844 = !DILocation(line: 0, scope: !760, inlinedAt: !839)
!845 = !DILocation(line: 0, scope: !767, inlinedAt: !840)
!846 = !DILocation(line: 0, scope: !772, inlinedAt: !841)
!847 = !DILocation(line: 0, scope: !739, inlinedAt: !848)
!848 = distinct !DILocation(line: 210, column: 25, scope: !746, inlinedAt: !849)
!849 = distinct !DILocation(line: 517, column: 13, scope: !753, inlinedAt: !850)
!850 = distinct !DILocation(line: 390, column: 4, scope: !759, inlinedAt: !851)
!851 = distinct !DILocation(line: 369, column: 2, scope: !766, inlinedAt: !852)
!852 = distinct !DILocation(line: 738, column: 7, scope: !771, inlinedAt: !853)
!853 = distinct !DILocation(line: 45, column: 1, scope: !723)
!854 = !DILocation(line: 0, scope: !746, inlinedAt: !849)
!855 = !DILocation(line: 0, scope: !753, inlinedAt: !850)
!856 = !DILocation(line: 0, scope: !760, inlinedAt: !851)
!857 = !DILocation(line: 0, scope: !767, inlinedAt: !852)
!858 = !DILocation(line: 0, scope: !772, inlinedAt: !853)
!859 = !DILocalVariable(name: "this", arg: 1, scope: !860, type: !743, flags: DIFlagArtificial | DIFlagObjectPointer)
!860 = distinct !DISubprogram(name: "allocate", linkageName: "_ZNSt15__new_allocatorIiE8allocateEmPKv", scope: !49, file: !50, line: 126, type: !66, scopeLine: 127, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, declaration: !65, retainedNodes: !861, keyInstructions: true)
!861 = !{!859, !862, !863}
!862 = !DILocalVariable(name: "__n", arg: 2, scope: !860, file: !50, line: 126, type: !68)
!863 = !DILocalVariable(arg: 3, scope: !860, file: !50, line: 126, type: !72)
!864 = !DILocation(line: 0, scope: !860, inlinedAt: !865)
!865 = distinct !DILocation(line: 198, column: 32, scope: !866, inlinedAt: !870)
!866 = distinct !DISubprogram(name: "allocate", linkageName: "_ZNSaIiE8allocateEm", scope: !43, file: !44, line: 189, type: !98, scopeLine: 190, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, declaration: !97, retainedNodes: !867, keyInstructions: true)
!867 = !{!868, !869}
!868 = !DILocalVariable(name: "this", arg: 1, scope: !866, type: !749, flags: DIFlagArtificial | DIFlagObjectPointer)
!869 = !DILocalVariable(name: "__n", arg: 2, scope: !866, file: !44, line: 189, type: !69)
!870 = distinct !DILocation(line: 482, column: 20, scope: !871, inlinedAt: !875)
!871 = distinct !DISubprogram(name: "allocate", linkageName: "_ZNSt16allocator_traitsISaIiEE8allocateERS0_m", scope: !32, file: !33, line: 481, type: !36, scopeLine: 482, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, declaration: !35, retainedNodes: !872, keyInstructions: true)
!872 = !{!873, !874}
!873 = !DILocalVariable(name: "__a", arg: 1, scope: !871, file: !33, line: 481, type: !41)
!874 = !DILocalVariable(name: "__n", arg: 2, scope: !871, file: !33, line: 481, type: !103)
!875 = distinct !DILocation(line: 381, column: 20, scope: !876, inlinedAt: !880)
!876 = distinct !DISubprogram(name: "_M_allocate", linkageName: "_ZNSt12_Vector_baseIiSaIiEE11_M_allocateEm", scope: !18, file: !2, line: 378, type: !228, scopeLine: 379, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, declaration: !227, retainedNodes: !877, keyInstructions: true)
!877 = !{!878, !879}
!878 = !DILocalVariable(name: "this", arg: 1, scope: !876, type: !693, flags: DIFlagArtificial | DIFlagObjectPointer)
!879 = !DILocalVariable(name: "__n", arg: 2, scope: !876, file: !2, line: 378, type: !69)
!880 = distinct !DILocation(line: 398, column: 33, scope: !881, inlinedAt: !885)
!881 = distinct !DISubprogram(name: "_M_create_storage", linkageName: "_ZNSt12_Vector_baseIiSaIiEE17_M_create_storageEm", scope: !18, file: !2, line: 396, type: !208, scopeLine: 397, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, declaration: !233, retainedNodes: !882, keyInstructions: true)
!882 = !{!883, !884}
!883 = !DILocalVariable(name: "this", arg: 1, scope: !881, type: !693, flags: DIFlagArtificial | DIFlagObjectPointer)
!884 = !DILocalVariable(name: "__n", arg: 2, scope: !881, file: !2, line: 396, type: !69)
!885 = distinct !DILocation(line: 335, column: 9, scope: !886, inlinedAt: !892)
!886 = distinct !DILexicalBlock(scope: !887, file: !2, line: 335, column: 7)
!887 = distinct !DISubprogram(name: "_Vector_base", linkageName: "_ZNSt12_Vector_baseIiSaIiEEC2EmRKS0_", scope: !18, file: !2, line: 333, type: !211, scopeLine: 335, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, declaration: !210, retainedNodes: !888, keyInstructions: true)
!888 = !{!889, !890, !891}
!889 = !DILocalVariable(name: "this", arg: 1, scope: !887, type: !693, flags: DIFlagArtificial | DIFlagObjectPointer)
!890 = !DILocalVariable(name: "__n", arg: 2, scope: !887, file: !2, line: 333, type: !69)
!891 = !DILocalVariable(name: "__a", arg: 3, scope: !887, file: !2, line: 333, type: !205)
!892 = distinct !DILocation(line: 557, column: 9, scope: !893, inlinedAt: !898)
!893 = distinct !DISubprogram(name: "vector", linkageName: "_ZNSt6vectorIiSaIiEEC2EmRKS0_", scope: !14, file: !2, line: 556, type: !294, scopeLine: 558, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, declaration: !293, retainedNodes: !894, keyInstructions: true)
!894 = !{!895, !896, !897}
!895 = !DILocalVariable(name: "this", arg: 1, scope: !893, type: !686, flags: DIFlagArtificial | DIFlagObjectPointer)
!896 = !DILocalVariable(name: "__n", arg: 2, scope: !893, file: !2, line: 556, type: !296)
!897 = !DILocalVariable(name: "__a", arg: 3, scope: !893, file: !2, line: 556, type: !290)
!898 = distinct !DILocation(line: 30, column: 20, scope: !723)
!899 = !DILocation(line: 0, scope: !866, inlinedAt: !870)
!900 = !DILocation(line: 0, scope: !871, inlinedAt: !875)
!901 = !DILocalVariable(arg: 3, scope: !902, file: !903, line: 778, type: !95)
!902 = distinct !DISubprogram(name: "__uninitialized_default_n_a<int *, unsigned long, int>", linkageName: "_ZSt27__uninitialized_default_n_aIPimiET_S1_T0_RSaIT1_E", scope: !15, file: !903, line: 777, type: !904, scopeLine: 779, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, templateParams: !909, retainedNodes: !906, keyInstructions: true)
!903 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/bits/stl_uninitialized.h", directory: "", checksumkind: CSK_MD5, checksum: "318d09ba72a8265560864b609bcb530f")
!904 = !DISubroutineType(types: !905)
!905 = !{!39, !39, !71, !95}
!906 = !{!907, !908, !901}
!907 = !DILocalVariable(name: "__first", arg: 1, scope: !902, file: !903, line: 777, type: !39)
!908 = !DILocalVariable(name: "__n", arg: 2, scope: !902, file: !903, line: 777, type: !71)
!909 = !{!910, !911, !82}
!910 = !DITemplateTypeParameter(name: "_ForwardIterator", type: !39)
!911 = !DITemplateTypeParameter(name: "_Size", type: !71)
!912 = !DILocation(line: 0, scope: !902, inlinedAt: !913)
!913 = distinct !DILocation(line: 1718, column: 4, scope: !914, inlinedAt: !918)
!914 = distinct !DISubprogram(name: "_M_default_initialize", linkageName: "_ZNSt6vectorIiSaIiEE21_M_default_initializeEm", scope: !14, file: !2, line: 1715, type: !500, scopeLine: 1716, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, declaration: !574, retainedNodes: !915, keyInstructions: true)
!915 = !{!916, !917}
!916 = !DILocalVariable(name: "this", arg: 1, scope: !914, type: !686, flags: DIFlagArtificial | DIFlagObjectPointer)
!917 = !DILocalVariable(name: "__n", arg: 2, scope: !914, file: !2, line: 1715, type: !296)
!918 = distinct !DILocation(line: 558, column: 9, scope: !919, inlinedAt: !898)
!919 = distinct !DILexicalBlock(scope: !893, file: !2, line: 558, column: 7)
!920 = !DILocation(line: 0, scope: !914, inlinedAt: !918)
!921 = !DILocation(line: 0, scope: !876, inlinedAt: !880)
!922 = !DILocation(line: 0, scope: !881, inlinedAt: !885)
!923 = !DILocation(line: 0, scope: !887, inlinedAt: !892)
!924 = !DILocation(line: 0, scope: !893, inlinedAt: !898)
!925 = !DILocalVariable(name: "__a", arg: 2, scope: !926, file: !2, line: 1907, type: !290)
!926 = distinct !DISubprogram(name: "_S_check_init_len", linkageName: "_ZNSt6vectorIiSaIiEE17_S_check_init_lenEmRKS0_", scope: !14, file: !2, line: 1907, type: !590, scopeLine: 1908, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, declaration: !589, retainedNodes: !927, keyInstructions: true)
!927 = !{!928, !925}
!928 = !DILocalVariable(name: "__n", arg: 1, scope: !926, file: !2, line: 1907, type: !296)
!929 = !DILocation(line: 0, scope: !926, inlinedAt: !930)
!930 = distinct !DILocation(line: 557, column: 15, scope: !893, inlinedAt: !898)
!931 = !DILocation(line: 0, scope: !739, inlinedAt: !932)
!932 = distinct !DILocation(line: 210, column: 25, scope: !746, inlinedAt: !933)
!933 = distinct !DILocation(line: 517, column: 13, scope: !753, inlinedAt: !934)
!934 = distinct !DILocation(line: 390, column: 4, scope: !759, inlinedAt: !935)
!935 = distinct !DILocation(line: 369, column: 2, scope: !766, inlinedAt: !936)
!936 = distinct !DILocation(line: 738, column: 7, scope: !771, inlinedAt: !937)
!937 = distinct !DILocation(line: 12, column: 8, scope: !776, inlinedAt: !938)
!938 = distinct !DILocation(line: 45, column: 1, scope: !723)
!939 = !DILocation(line: 0, scope: !746, inlinedAt: !933)
!940 = !DILocation(line: 0, scope: !753, inlinedAt: !934)
!941 = !DILocation(line: 0, scope: !760, inlinedAt: !935)
!942 = !DILocation(line: 0, scope: !767, inlinedAt: !936)
!943 = !DILocation(line: 0, scope: !772, inlinedAt: !937)
!944 = !DILocation(line: 0, scope: !777, inlinedAt: !938)
!945 = !DILocation(line: 0, scope: !704, inlinedAt: !946)
!946 = distinct !DILocation(line: 155, column: 36, scope: !697, inlinedAt: !947)
!947 = distinct !DILocation(line: 338, column: 7, scope: !690, inlinedAt: !948)
!948 = distinct !DILocation(line: 620, column: 7, scope: !683, inlinedAt: !949)
!949 = distinct !DILocation(line: 12, column: 8, scope: !671, inlinedAt: !950)
!950 = distinct !DILocation(line: 42, column: 21, scope: !723)
!951 = !DILocation(line: 0, scope: !697, inlinedAt: !947)
!952 = !DILocation(line: 0, scope: !690, inlinedAt: !948)
!953 = !DILocation(line: 0, scope: !683, inlinedAt: !949)
!954 = !DILocation(line: 0, scope: !671, inlinedAt: !950)
!955 = !DILocation(line: 0, scope: !704, inlinedAt: !956)
!956 = distinct !DILocation(line: 155, column: 36, scope: !697, inlinedAt: !957)
!957 = distinct !DILocation(line: 338, column: 7, scope: !690, inlinedAt: !958)
!958 = distinct !DILocation(line: 620, column: 7, scope: !683, inlinedAt: !959)
!959 = distinct !DILocation(line: 12, column: 8, scope: !671, inlinedAt: !960)
!960 = distinct !DILocation(line: 170, column: 14, scope: !961, inlinedAt: !974)
!961 = distinct !DISubprogram(name: "accumulate<__gnu_cxx::__normal_iterator<int *, std::vector<int, std::allocator<int> > >, Box, (lambda at prototype/fixtures/fold_recurrence.cpp:34:7)>", linkageName: "_ZSt10accumulateIN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEE3BoxZ7advance3EnviE3$_0ET0_T_SB_SA_T1_", scope: !15, file: !962, line: 161, type: !963, scopeLine: 163, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagLocalToUnit | DISPFlagDefinition | DISPFlagOptimized, unit: !8, templateParams: !970, retainedNodes: !965, keyInstructions: true)
!962 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/bits/stl_numeric.h", directory: "", checksumkind: CSK_MD5, checksum: "a160d3a1010219c7f0a400e068b1b39c")
!963 = !DISubroutineType(types: !964)
!964 = !{!11, !357, !357, !11, !737}
!965 = !{!966, !967, !968, !969}
!966 = !DILocalVariable(name: "__first", arg: 1, scope: !961, file: !962, line: 161, type: !357)
!967 = !DILocalVariable(name: "__last", arg: 2, scope: !961, file: !962, line: 161, type: !357)
!968 = !DILocalVariable(name: "__init", arg: 3, scope: !961, file: !962, line: 161, type: !11)
!969 = !DILocalVariable(name: "__binary_op", arg: 4, scope: !961, file: !962, line: 162, type: !737)
!970 = !{!971, !972, !973}
!971 = !DITemplateTypeParameter(name: "_InputIterator", type: !357)
!972 = !DITemplateTypeParameter(name: "_Tp", type: !11)
!973 = !DITemplateTypeParameter(name: "_BinaryOperation", type: !737)
!974 = distinct !DILocation(line: 32, column: 17, scope: !723)
!975 = !DILocation(line: 0, scope: !697, inlinedAt: !957)
!976 = !DILocation(line: 0, scope: !690, inlinedAt: !958)
!977 = !DILocation(line: 0, scope: !683, inlinedAt: !959)
!978 = !DILocation(line: 0, scope: !671, inlinedAt: !960)
!979 = !DILocation(line: 0, scope: !739, inlinedAt: !980)
!980 = distinct !DILocation(line: 210, column: 25, scope: !746, inlinedAt: !981)
!981 = distinct !DILocation(line: 517, column: 13, scope: !753, inlinedAt: !982)
!982 = distinct !DILocation(line: 390, column: 4, scope: !759, inlinedAt: !983)
!983 = distinct !DILocation(line: 369, column: 2, scope: !766, inlinedAt: !984)
!984 = distinct !DILocation(line: 738, column: 7, scope: !771, inlinedAt: !985)
!985 = distinct !DILocation(line: 12, column: 8, scope: !776, inlinedAt: !986)
!986 = distinct !DILocation(line: 32, column: 17, scope: !723)
!987 = !DILocation(line: 0, scope: !746, inlinedAt: !981)
!988 = !DILocation(line: 0, scope: !753, inlinedAt: !982)
!989 = !DILocation(line: 0, scope: !760, inlinedAt: !983)
!990 = !DILocation(line: 0, scope: !767, inlinedAt: !984)
!991 = !DILocation(line: 0, scope: !772, inlinedAt: !985)
!992 = !DILocation(line: 0, scope: !777, inlinedAt: !986)
!993 = !DILocation(line: 0, scope: !739, inlinedAt: !994)
!994 = distinct !DILocation(line: 210, column: 25, scope: !746, inlinedAt: !995)
!995 = distinct !DILocation(line: 517, column: 13, scope: !753, inlinedAt: !996)
!996 = distinct !DILocation(line: 390, column: 4, scope: !759, inlinedAt: !997)
!997 = distinct !DILocation(line: 369, column: 2, scope: !766, inlinedAt: !998)
!998 = distinct !DILocation(line: 738, column: 7, scope: !771, inlinedAt: !999)
!999 = distinct !DILocation(line: 12, column: 8, scope: !776, inlinedAt: !1000)
!1000 = distinct !DILocation(line: 32, column: 17, scope: !723)
!1001 = !DILocation(line: 0, scope: !746, inlinedAt: !995)
!1002 = !DILocation(line: 0, scope: !753, inlinedAt: !996)
!1003 = !DILocation(line: 0, scope: !760, inlinedAt: !997)
!1004 = !DILocation(line: 0, scope: !767, inlinedAt: !998)
!1005 = !DILocation(line: 0, scope: !772, inlinedAt: !999)
!1006 = !DILocation(line: 0, scope: !777, inlinedAt: !1000)
!1007 = !DILocation(line: 0, scope: !704, inlinedAt: !1008)
!1008 = distinct !DILocation(line: 155, column: 36, scope: !697, inlinedAt: !1009)
!1009 = distinct !DILocation(line: 338, column: 7, scope: !690, inlinedAt: !1010)
!1010 = distinct !DILocation(line: 620, column: 7, scope: !683, inlinedAt: !1011)
!1011 = distinct !DILocation(line: 12, column: 8, scope: !671, inlinedAt: !1012)
!1012 = distinct !DILocation(line: 169, column: 23, scope: !1013, inlinedAt: !974)
!1013 = distinct !DILexicalBlock(scope: !1014, file: !962, line: 168, column: 7)
!1014 = distinct !DILexicalBlock(scope: !961, file: !962, line: 168, column: 7)
!1015 = !DILocation(line: 0, scope: !697, inlinedAt: !1009)
!1016 = !DILocation(line: 0, scope: !690, inlinedAt: !1010)
!1017 = !DILocation(line: 0, scope: !683, inlinedAt: !1011)
!1018 = !DILocation(line: 0, scope: !671, inlinedAt: !1012)
!1019 = !DILocalVariable(arg: 4, scope: !1020, file: !903, line: 367, type: !95)
!1020 = distinct !DISubprogram(name: "__uninitialized_copy_a<__gnu_cxx::__normal_iterator<const int *, std::vector<int, std::allocator<int> > >, int *, int>", linkageName: "_ZSt22__uninitialized_copy_aIN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEPiiET0_T_SA_S9_RSaIT1_E", scope: !15, file: !903, line: 366, type: !1021, scopeLine: 368, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, templateParams: !1027, retainedNodes: !1023, keyInstructions: true)
!1021 = !DISubroutineType(types: !1022)
!1022 = !{!39, !420, !420, !39, !95}
!1023 = !{!1024, !1025, !1026, !1019}
!1024 = !DILocalVariable(name: "__first", arg: 1, scope: !1020, file: !903, line: 366, type: !420)
!1025 = !DILocalVariable(name: "__last", arg: 2, scope: !1020, file: !903, line: 366, type: !420)
!1026 = !DILocalVariable(name: "__result", arg: 3, scope: !1020, file: !903, line: 367, type: !39)
!1027 = !{!1028, !910, !82}
!1028 = !DITemplateTypeParameter(name: "_InputIterator", type: !420)
!1029 = !DILocation(line: 0, scope: !1020, inlinedAt: !1030)
!1030 = distinct !DILocation(line: 606, column: 4, scope: !1031, inlinedAt: !814)
!1031 = distinct !DILexicalBlock(scope: !810, file: !2, line: 604, column: 7)
!1032 = !DILocation(line: 0, scope: !860, inlinedAt: !1033)
!1033 = distinct !DILocation(line: 198, column: 32, scope: !866, inlinedAt: !1034)
!1034 = distinct !DILocation(line: 482, column: 20, scope: !871, inlinedAt: !1035)
!1035 = distinct !DILocation(line: 381, column: 20, scope: !876, inlinedAt: !1036)
!1036 = distinct !DILocation(line: 398, column: 33, scope: !881, inlinedAt: !1037)
!1037 = distinct !DILocation(line: 335, column: 9, scope: !886, inlinedAt: !1038)
!1038 = distinct !DILocation(line: 602, column: 9, scope: !810, inlinedAt: !814)
!1039 = !DILocation(line: 0, scope: !866, inlinedAt: !1034)
!1040 = !DILocation(line: 0, scope: !871, inlinedAt: !1035)
!1041 = !DILocation(line: 0, scope: !876, inlinedAt: !1036)
!1042 = !DILocation(line: 0, scope: !881, inlinedAt: !1037)
!1043 = !DILocation(line: 0, scope: !887, inlinedAt: !1038)
!1044 = distinct !DIAssignID()
!1045 = !DILocation(line: 0, scope: !723)
!1046 = !DILocation(line: 29, column: 32, scope: !723)
!1047 = !DILocation(line: 106, column: 17, scope: !704, inlinedAt: !828, atomGroup: 1, atomRank: 2)
!1048 = !{!664, !665, i64 0}
!1049 = !DILocation(line: 106, column: 42, scope: !704, inlinedAt: !828)
!1050 = !DILocation(line: 106, column: 42, scope: !704, inlinedAt: !828, atomGroup: 2, atomRank: 2)
!1051 = !{!664, !665, i64 8}
!1052 = !DILocation(line: 107, column: 26, scope: !704, inlinedAt: !828)
!1053 = !DILocation(line: 107, column: 26, scope: !704, inlinedAt: !828, atomGroup: 3, atomRank: 2)
!1054 = !DILocation(line: 108, column: 33, scope: !719, inlinedAt: !828, atomGroup: 5, atomRank: 1)
!1055 = !DILocation(line: 29, column: 64, scope: !723)
!1056 = !DILocation(line: 29, column: 46, scope: !723, atomGroup: 1, atomRank: 1)
!1057 = !DILocation(line: 30, column: 47, scope: !723)
!1058 = !DILocation(line: 1909, column: 10, scope: !1059, inlinedAt: !930, atomGroup: 1, atomRank: 2)
!1059 = distinct !DILexicalBlock(scope: !926, file: !2, line: 1909, column: 6)
!1060 = !DILocation(line: 1909, column: 6, scope: !1059, inlinedAt: !930, atomGroup: 1, atomRank: 1)
!1061 = !DILocation(line: 1910, column: 4, scope: !1059, inlinedAt: !930)
!1062 = !DILocation(line: 381, column: 13, scope: !876, inlinedAt: !880, atomGroup: 2, atomRank: 2)
!1063 = !DILocation(line: 381, column: 9, scope: !876, inlinedAt: !880, atomGroup: 2, atomRank: 1)
!1064 = !DILocation(line: 151, column: 53, scope: !860, inlinedAt: !865)
!1065 = !DILocation(line: 151, column: 27, scope: !860, inlinedAt: !865, atomGroup: 3, atomRank: 2)
!1066 = !DILocation(line: 400, column: 59, scope: !881, inlinedAt: !885, atomGroup: 3, atomRank: 2)
!1067 = !DILocalVariable(name: "__first", arg: 1, scope: !1068, file: !903, line: 696, type: !39)
!1068 = distinct !DISubprogram(name: "__uninitialized_default_n<int *, unsigned long>", linkageName: "_ZSt25__uninitialized_default_nIPimET_S1_T0_", scope: !15, file: !903, line: 696, type: !1069, scopeLine: 697, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, templateParams: !1074, retainedNodes: !1071, keyInstructions: true)
!1069 = !DISubroutineType(types: !1070)
!1070 = !{!39, !39, !71}
!1071 = !{!1067, !1072, !1073}
!1072 = !DILocalVariable(name: "__n", arg: 2, scope: !1068, file: !903, line: 696, type: !71)
!1073 = !DILocalVariable(name: "__can_fill", scope: !1068, file: !903, line: 707, type: !243)
!1074 = !{!910, !911}
!1075 = !DILocation(line: 0, scope: !1068, inlinedAt: !1076)
!1076 = distinct !DILocation(line: 779, column: 14, scope: !902, inlinedAt: !913)
!1077 = !DILocalVariable(name: "__first", arg: 1, scope: !1078, file: !903, line: 660, type: !39)
!1078 = distinct !DISubprogram(name: "__uninit_default_n<int *, unsigned long>", linkageName: "_ZNSt27__uninitialized_default_n_1ILb1EE18__uninit_default_nIPimEET_S3_T0_", scope: !1079, file: !903, line: 660, type: !1069, scopeLine: 661, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, templateParams: !1074, declaration: !1082, retainedNodes: !1083, keyInstructions: true)
!1079 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "__uninitialized_default_n_1<true>", scope: !15, file: !903, line: 655, size: 8, flags: DIFlagTypePassByValue, elements: !138, templateParams: !1080, identifier: "_ZTSSt27__uninitialized_default_n_1ILb1EE")
!1080 = !{!1081}
!1081 = !DITemplateValueParameter(name: "_TrivialValueType", type: !131, value: i1 true)
!1082 = !DISubprogram(name: "__uninit_default_n<int *, unsigned long>", linkageName: "_ZNSt27__uninitialized_default_n_1ILb1EE18__uninit_default_nIPimEET_S3_T0_", scope: !1079, file: !903, line: 660, type: !1069, scopeLine: 660, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: DISPFlagOptimized, templateParams: !1074)
!1083 = !{!1077, !1084, !1085}
!1084 = !DILocalVariable(name: "__n", arg: 2, scope: !1078, file: !903, line: 660, type: !71)
!1085 = !DILocalVariable(name: "__val", scope: !1086, file: !903, line: 664, type: !1088)
!1086 = distinct !DILexicalBlock(scope: !1087, file: !903, line: 663, column: 6)
!1087 = distinct !DILexicalBlock(scope: !1078, file: !903, line: 662, column: 8)
!1088 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !1089, size: 64)
!1089 = !DIDerivedType(tag: DW_TAG_typedef, name: "value_type", scope: !376, file: !375, line: 202, baseType: !1090)
!1090 = !DIDerivedType(tag: DW_TAG_typedef, name: "remove_cv_t<int>", scope: !15, file: !239, line: 1591, baseType: !1091)
!1091 = !DIDerivedType(tag: DW_TAG_typedef, name: "type", scope: !1092, file: !239, line: 1543, baseType: !40)
!1092 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "remove_cv<int>", scope: !15, file: !239, line: 1542, size: 8, flags: DIFlagTypePassByValue, elements: !138, templateParams: !1093, identifier: "_ZTSSt9remove_cvIiE")
!1093 = !{!1094}
!1094 = !DITemplateTypeParameter(type: !40)
!1095 = !DILocation(line: 0, scope: !1078, inlinedAt: !1096)
!1096 = distinct !DILocation(line: 710, column: 14, scope: !1068, inlinedAt: !1076)
!1097 = !DILocation(line: 0, scope: !1086, inlinedAt: !1096)
!1098 = !DILocalVariable(name: "__p", arg: 1, scope: !1099, file: !1100, line: 109, type: !39)
!1099 = distinct !DISubprogram(name: "_Construct<int>", linkageName: "_ZSt10_ConstructIiJEEvPT_DpOT0_", scope: !15, file: !1100, line: 109, type: !1101, scopeLine: 110, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, templateParams: !1104, retainedNodes: !1103, keyInstructions: true)
!1100 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/bits/stl_construct.h", directory: "", checksumkind: CSK_MD5, checksum: "2692aca002018b5b1663c464dddaf63f")
!1101 = !DISubroutineType(types: !1102)
!1102 = !{null, !39}
!1103 = !{!1098}
!1104 = !{!82, !1105}
!1105 = !DITemplateValueParameter(tag: DW_TAG_GNU_template_parameter_pack, name: "_Args", value: !138)
!1106 = !DILocation(line: 0, scope: !1099, inlinedAt: !1107)
!1107 = distinct !DILocation(line: 666, column: 8, scope: !1086, inlinedAt: !1096)
!1108 = !DILocation(line: 119, column: 7, scope: !1099, inlinedAt: !1107)
!1109 = !{!648, !648, i64 0}
!1110 = !DILocation(line: 667, column: 8, scope: !1086, inlinedAt: !1096, atomGroup: 3, atomRank: 2)
!1111 = !DILocation(line: 668, column: 43, scope: !1086, inlinedAt: !1096)
!1112 = !DILocalVariable(name: "__first", arg: 1, scope: !1113, file: !1114, line: 1152, type: !39)
!1113 = distinct !DISubprogram(name: "fill_n<int *, unsigned long, int>", linkageName: "_ZSt6fill_nIPimiET_S1_T0_RKT1_", scope: !15, file: !1114, line: 1152, type: !1115, scopeLine: 1153, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, templateParams: !1120, retainedNodes: !1117, keyInstructions: true)
!1114 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/bits/stl_algobase.h", directory: "", checksumkind: CSK_MD5, checksum: "574810298133f03eba3456d6f78306fe")
!1115 = !DISubroutineType(types: !1116)
!1116 = !{!39, !39, !71, !442}
!1117 = !{!1112, !1118, !1119}
!1118 = !DILocalVariable(name: "__n", arg: 2, scope: !1113, file: !1114, line: 1152, type: !71)
!1119 = !DILocalVariable(name: "__value", arg: 3, scope: !1113, file: !1114, line: 1152, type: !442)
!1120 = !{!1121, !911, !82}
!1121 = !DITemplateTypeParameter(name: "_OI", type: !39)
!1122 = !DILocation(line: 0, scope: !1113, inlinedAt: !1123)
!1123 = distinct !DILocation(line: 668, column: 18, scope: !1086, inlinedAt: !1096)
!1124 = !DILocalVariable(name: "__first", arg: 1, scope: !1125, file: !1114, line: 1117, type: !39)
!1125 = distinct !DISubprogram(name: "__fill_n_a<int *, unsigned long, int>", linkageName: "_ZSt10__fill_n_aIPimiET_S1_T0_RKT1_St26random_access_iterator_tag", scope: !15, file: !1114, line: 1117, type: !1126, scopeLine: 1119, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, templateParams: !1142, retainedNodes: !1138, keyInstructions: true)
!1126 = !DISubroutineType(types: !1127)
!1127 = !{!39, !39, !71, !442, !1128}
!1128 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "random_access_iterator_tag", scope: !15, file: !375, line: 107, size: 8, flags: DIFlagTypePassByValue, elements: !1129, identifier: "_ZTSSt26random_access_iterator_tag")
!1129 = !{!1130}
!1130 = !DIDerivedType(tag: DW_TAG_inheritance, scope: !1128, baseType: !1131, extraData: i32 0)
!1131 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "bidirectional_iterator_tag", scope: !15, file: !375, line: 103, size: 8, flags: DIFlagTypePassByValue, elements: !1132, identifier: "_ZTSSt26bidirectional_iterator_tag")
!1132 = !{!1133}
!1133 = !DIDerivedType(tag: DW_TAG_inheritance, scope: !1131, baseType: !1134, extraData: i32 0)
!1134 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "forward_iterator_tag", scope: !15, file: !375, line: 99, size: 8, flags: DIFlagTypePassByValue, elements: !1135, identifier: "_ZTSSt20forward_iterator_tag")
!1135 = !{!1136}
!1136 = !DIDerivedType(tag: DW_TAG_inheritance, scope: !1134, baseType: !1137, extraData: i32 0)
!1137 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "input_iterator_tag", scope: !15, file: !375, line: 93, size: 8, flags: DIFlagTypePassByValue, elements: !138, identifier: "_ZTSSt18input_iterator_tag")
!1138 = !{!1124, !1139, !1140, !1141}
!1139 = !DILocalVariable(name: "__n", arg: 2, scope: !1125, file: !1114, line: 1117, type: !71)
!1140 = !DILocalVariable(name: "__value", arg: 3, scope: !1125, file: !1114, line: 1117, type: !442)
!1141 = !DILocalVariable(arg: 4, scope: !1125, file: !1114, line: 1118, type: !1128)
!1142 = !{!1143, !911, !82}
!1143 = !DITemplateTypeParameter(name: "_OutputIterator", type: !39)
!1144 = !DILocation(line: 0, scope: !1125, inlinedAt: !1145)
!1145 = distinct !DILocation(line: 1157, column: 14, scope: !1113, inlinedAt: !1123)
!1146 = !DILocation(line: 1123, column: 15, scope: !1147, inlinedAt: !1145, atomGroup: 1, atomRank: 2)
!1147 = distinct !DILexicalBlock(scope: !1125, file: !1114, line: 1123, column: 11)
!1148 = !DILocation(line: 1123, column: 15, scope: !1147, inlinedAt: !1145, atomGroup: 1, atomRank: 1)
!1149 = !DILocation(line: 1128, column: 38, scope: !1125, inlinedAt: !1145)
!1150 = !DILocalVariable(name: "__first", arg: 1, scope: !1151, file: !1114, line: 976, type: !39)
!1151 = distinct !DISubprogram(name: "__fill_a<int *, int>", linkageName: "_ZSt8__fill_aIPiiEvT_S1_RKT0_", scope: !15, file: !1114, line: 976, type: !1152, scopeLine: 977, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, templateParams: !1157, retainedNodes: !1154, keyInstructions: true)
!1152 = !DISubroutineType(types: !1153)
!1153 = !{null, !39, !39, !442}
!1154 = !{!1150, !1155, !1156}
!1155 = !DILocalVariable(name: "__last", arg: 2, scope: !1151, file: !1114, line: 976, type: !39)
!1156 = !DILocalVariable(name: "__value", arg: 3, scope: !1151, file: !1114, line: 976, type: !442)
!1157 = !{!1158, !82}
!1158 = !DITemplateTypeParameter(name: "_FIte", type: !39)
!1159 = !DILocation(line: 0, scope: !1151, inlinedAt: !1160)
!1160 = distinct !DILocation(line: 1128, column: 7, scope: !1125, inlinedAt: !1145)
!1161 = !DILocalVariable(name: "__first", arg: 1, scope: !1162, file: !1114, line: 926, type: !39)
!1162 = distinct !DISubprogram(name: "__fill_a1<int *, int>", linkageName: "_ZSt9__fill_a1IPiiEN9__gnu_cxx11__enable_ifIXsr11__is_scalarIT0_EE7__valueEvE6__typeET_S6_RKS3_", scope: !15, file: !1114, line: 926, type: !1163, scopeLine: 928, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, templateParams: !1175, retainedNodes: !1171, keyInstructions: true)
!1163 = !DISubroutineType(types: !1164)
!1164 = !{!1165, !39, !39, !442}
!1165 = !DIDerivedType(tag: DW_TAG_typedef, name: "__type", scope: !1167, file: !1166, line: 50, baseType: null)
!1166 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/ext/type_traits.h", directory: "")
!1167 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "__enable_if<true, void>", scope: !29, file: !1166, line: 49, size: 8, flags: DIFlagTypePassByValue, elements: !138, templateParams: !1168, identifier: "_ZTSN9__gnu_cxx11__enable_ifILb1EvEE")
!1168 = !{!1169, !1170}
!1169 = !DITemplateValueParameter(type: !131, value: i1 true)
!1170 = !DITemplateTypeParameter(type: null)
!1171 = !{!1161, !1172, !1173, !1174}
!1172 = !DILocalVariable(name: "__last", arg: 2, scope: !1162, file: !1114, line: 926, type: !39)
!1173 = !DILocalVariable(name: "__value", arg: 3, scope: !1162, file: !1114, line: 927, type: !442)
!1174 = !DILocalVariable(name: "__tmp", scope: !1162, file: !1114, line: 929, type: !424)
!1175 = !{!910, !82}
!1176 = !DILocation(line: 0, scope: !1162, inlinedAt: !1177)
!1177 = distinct !DILocation(line: 977, column: 7, scope: !1151, inlinedAt: !1160)
!1178 = !DILocation(line: 931, column: 11, scope: !1179, inlinedAt: !1177, atomGroup: 4, atomRank: 1)
!1179 = distinct !DILexicalBlock(scope: !1180, file: !1114, line: 930, column: 7)
!1180 = distinct !DILexicalBlock(scope: !1162, file: !1114, line: 930, column: 7)
!1181 = !DILocalVariable(name: "this", arg: 1, scope: !1182, type: !1184, flags: DIFlagArtificial | DIFlagObjectPointer)
!1182 = distinct !DISubprogram(name: "operator++", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEppEv", scope: !357, file: !358, line: 1109, type: !388, scopeLine: 1110, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, declaration: !387, retainedNodes: !1183, keyInstructions: true)
!1183 = !{!1181}
!1184 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !357, size: 64)
!1185 = !DILocation(line: 0, scope: !1182, inlinedAt: !1186)
!1186 = distinct !DILocation(line: 97, column: 33, scope: !1187, inlinedAt: !1198)
!1187 = distinct !DILexicalBlock(scope: !1188, file: !962, line: 97, column: 7)
!1188 = distinct !DILexicalBlock(scope: !1189, file: !962, line: 97, column: 7)
!1189 = distinct !DISubprogram(name: "iota<__gnu_cxx::__normal_iterator<int *, std::vector<int, std::allocator<int> > >, int>", linkageName: "_ZSt4iotaIN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEEiEvT_S7_T0_", scope: !15, file: !962, line: 88, type: !1190, scopeLine: 89, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, templateParams: !1196, retainedNodes: !1192, keyInstructions: true)
!1190 = !DISubroutineType(types: !1191)
!1191 = !{null, !357, !357, !40}
!1192 = !{!1193, !1194, !1195}
!1193 = !DILocalVariable(name: "__first", arg: 1, scope: !1189, file: !962, line: 88, type: !357)
!1194 = !DILocalVariable(name: "__last", arg: 2, scope: !1189, file: !962, line: 88, type: !357)
!1195 = !DILocalVariable(name: "__value", arg: 3, scope: !1189, file: !962, line: 88, type: !40)
!1196 = !{!1197, !82}
!1197 = !DITemplateTypeParameter(name: "_ForwardIterator", type: !357)
!1198 = distinct !DILocation(line: 31, column: 3, scope: !723)
!1199 = !DILocation(line: 0, scope: !1189, inlinedAt: !1198)
!1200 = !DILocalVariable(name: "__lhs", arg: 1, scope: !1201, file: !358, line: 1197, type: !1204)
!1201 = distinct !DISubprogram(name: "operator==<int *, std::vector<int, std::allocator<int> > >", linkageName: "_ZN9__gnu_cxxeqIPiSt6vectorIiSaIiEEEEbRKNS_17__normal_iteratorIT_T0_EESA_QrqXeqcldtfp_4baseEcldtfp0_4baseERSt14convertible_toIbEE", scope: !29, file: !358, line: 1197, type: !1202, scopeLine: 1203, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, templateParams: !414, retainedNodes: !1205, keyInstructions: true)
!1202 = !DISubroutineType(types: !1203)
!1203 = !{!131, !1204, !1204}
!1204 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !381, size: 64)
!1205 = !{!1200, !1206}
!1206 = !DILocalVariable(name: "__rhs", arg: 2, scope: !1201, file: !358, line: 1198, type: !1204)
!1207 = !DILocation(line: 0, scope: !1201, inlinedAt: !1208)
!1208 = distinct !DILocation(line: 97, column: 22, scope: !1187, inlinedAt: !1198)
!1209 = !DILocation(line: 97, column: 7, scope: !1188, inlinedAt: !1198, atomGroup: 15, atomRank: 1)
!1210 = !DILocation(line: 97, column: 7, scope: !1188, inlinedAt: !1198)
!1211 = !DILocation(line: 99, column: 13, scope: !1212, inlinedAt: !1198, atomGroup: 3, atomRank: 1)
!1212 = distinct !DILexicalBlock(scope: !1187, file: !962, line: 98, column: 2)
!1213 = !DILocation(line: 97, column: 7, scope: !1188, inlinedAt: !1198, atomGroup: 2, atomRank: 1)
!1214 = distinct !{!1214, !1215, !1216, !1217}
!1215 = !{!"llvm.loop.mustprogress"}
!1216 = !{!"llvm.loop.isvectorized", i32 1}
!1217 = !{!"llvm.loop.unroll.runtime.disable"}
!1218 = !DILocation(line: 100, column: 4, scope: !1212, inlinedAt: !1198, atomGroup: 4, atomRank: 2)
!1219 = !DILocation(line: 1111, column: 2, scope: !1182, inlinedAt: !1186, atomGroup: 1, atomRank: 2)
!1220 = !DILocation(line: 1203, column: 27, scope: !1201, inlinedAt: !1208, atomGroup: 1, atomRank: 2)
!1221 = distinct !{!1221, !1215, !1217, !1216}
!1222 = !DILocation(line: 370, column: 35, scope: !766, inlinedAt: !840)
!1223 = !DILocation(line: 993, column: 50, scope: !805, inlinedAt: !809)
!1224 = !DILocation(line: 381, column: 13, scope: !876, inlinedAt: !1036, atomGroup: 2, atomRank: 2)
!1225 = !DILocation(line: 381, column: 9, scope: !876, inlinedAt: !1036, atomGroup: 2, atomRank: 1)
!1226 = !DILocation(line: 400, column: 59, scope: !881, inlinedAt: !1037, atomGroup: 20, atomRank: 2)
!1227 = !DILocalVariable(name: "__first", arg: 1, scope: !1228, file: !903, line: 163, type: !420)
!1228 = distinct !DISubprogram(name: "uninitialized_copy<__gnu_cxx::__normal_iterator<const int *, std::vector<int, std::allocator<int> > >, int *>", linkageName: "_ZSt18uninitialized_copyIN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEPiET0_T_SA_S9_", scope: !15, file: !903, line: 163, type: !1229, scopeLine: 165, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, templateParams: !1236, retainedNodes: !1231, keyInstructions: true)
!1229 = !DISubroutineType(types: !1230)
!1230 = !{!39, !420, !420, !39}
!1231 = !{!1227, !1232, !1233, !1234, !1235}
!1232 = !DILocalVariable(name: "__last", arg: 2, scope: !1228, file: !903, line: 163, type: !420)
!1233 = !DILocalVariable(name: "__result", arg: 3, scope: !1228, file: !903, line: 164, type: !39)
!1234 = !DILocalVariable(name: "__can_memmove", scope: !1228, file: !903, line: 174, type: !243)
!1235 = !DILocalVariable(name: "__assignable", scope: !1228, file: !903, line: 181, type: !243)
!1236 = !{!1028, !910}
!1237 = !DILocation(line: 0, scope: !1228, inlinedAt: !1238)
!1238 = distinct !DILocation(line: 373, column: 14, scope: !1020, inlinedAt: !1030)
!1239 = !DILocalVariable(name: "__first", arg: 1, scope: !1240, file: !903, line: 145, type: !420)
!1240 = distinct !DISubprogram(name: "__uninit_copy<__gnu_cxx::__normal_iterator<const int *, std::vector<int, std::allocator<int> > >, int *>", linkageName: "_ZNSt20__uninitialized_copyILb1EE13__uninit_copyIN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEPiEET0_T_SC_SB_", scope: !1241, file: !903, line: 145, type: !1229, scopeLine: 147, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, templateParams: !1236, declaration: !1244, retainedNodes: !1245, keyInstructions: true)
!1241 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "__uninitialized_copy<true>", scope: !15, file: !903, line: 141, size: 8, flags: DIFlagTypePassByValue, elements: !138, templateParams: !1242, identifier: "_ZTSSt20__uninitialized_copyILb1EE")
!1242 = !{!1243}
!1243 = !DITemplateValueParameter(name: "_TrivialValueTypes", type: !131, value: i1 true)
!1244 = !DISubprogram(name: "__uninit_copy<__gnu_cxx::__normal_iterator<const int *, std::vector<int, std::allocator<int> > >, int *>", linkageName: "_ZNSt20__uninitialized_copyILb1EE13__uninit_copyIN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEPiEET0_T_SC_SB_", scope: !1241, file: !903, line: 145, type: !1229, scopeLine: 145, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: DISPFlagOptimized, templateParams: !1236)
!1245 = !{!1239, !1246, !1247}
!1246 = !DILocalVariable(name: "__last", arg: 2, scope: !1240, file: !903, line: 145, type: !420)
!1247 = !DILocalVariable(name: "__result", arg: 3, scope: !1240, file: !903, line: 146, type: !39)
!1248 = !DILocation(line: 0, scope: !1240, inlinedAt: !1249)
!1249 = distinct !DILocation(line: 184, column: 14, scope: !1228, inlinedAt: !1238)
!1250 = !DILocalVariable(name: "__first", arg: 1, scope: !1251, file: !1114, line: 624, type: !420)
!1251 = distinct !DISubprogram(name: "copy<__gnu_cxx::__normal_iterator<const int *, std::vector<int, std::allocator<int> > >, int *>", linkageName: "_ZSt4copyIN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEPiET0_T_SA_S9_", scope: !15, file: !1114, line: 624, type: !1229, scopeLine: 625, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, templateParams: !1255, retainedNodes: !1252, keyInstructions: true)
!1252 = !{!1250, !1253, !1254}
!1253 = !DILocalVariable(name: "__last", arg: 2, scope: !1251, file: !1114, line: 624, type: !420)
!1254 = !DILocalVariable(name: "__result", arg: 3, scope: !1251, file: !1114, line: 624, type: !39)
!1255 = !{!1256, !1121}
!1256 = !DITemplateTypeParameter(name: "_II", type: !420)
!1257 = !DILocation(line: 0, scope: !1251, inlinedAt: !1258)
!1258 = distinct !DILocation(line: 147, column: 18, scope: !1240, inlinedAt: !1249)
!1259 = !DILocalVariable(name: "__first", arg: 1, scope: !1260, file: !1114, line: 538, type: !420)
!1260 = distinct !DISubprogram(name: "__copy_move_a<false, __gnu_cxx::__normal_iterator<const int *, std::vector<int, std::allocator<int> > >, int *>", linkageName: "_ZSt13__copy_move_aILb0EN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEPiET1_T0_SA_S9_", scope: !15, file: !1114, line: 538, type: !1229, scopeLine: 539, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, templateParams: !1264, retainedNodes: !1261, keyInstructions: true)
!1261 = !{!1259, !1262, !1263}
!1262 = !DILocalVariable(name: "__last", arg: 2, scope: !1260, file: !1114, line: 538, type: !420)
!1263 = !DILocalVariable(name: "__result", arg: 3, scope: !1260, file: !1114, line: 538, type: !39)
!1264 = !{!1265, !1256, !1121}
!1265 = !DITemplateValueParameter(name: "_IsMove", type: !131, value: i1 false)
!1266 = !DILocation(line: 0, scope: !1260, inlinedAt: !1267)
!1267 = distinct !DILocation(line: 632, column: 14, scope: !1251, inlinedAt: !1258)
!1268 = !DILocalVariable(name: "__first", arg: 1, scope: !1269, file: !1114, line: 532, type: !423)
!1269 = distinct !DISubprogram(name: "__copy_move_a1<false, const int *, int *>", linkageName: "_ZSt14__copy_move_a1ILb0EPKiPiET1_T0_S4_S3_", scope: !15, file: !1114, line: 532, type: !1270, scopeLine: 533, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, templateParams: !1275, retainedNodes: !1272, keyInstructions: true)
!1270 = !DISubroutineType(types: !1271)
!1271 = !{!39, !423, !423, !39}
!1272 = !{!1268, !1273, !1274}
!1273 = !DILocalVariable(name: "__last", arg: 2, scope: !1269, file: !1114, line: 532, type: !423)
!1274 = !DILocalVariable(name: "__result", arg: 3, scope: !1269, file: !1114, line: 532, type: !39)
!1275 = !{!1265, !1276, !1121}
!1276 = !DITemplateTypeParameter(name: "_II", type: !423)
!1277 = !DILocation(line: 0, scope: !1269, inlinedAt: !1278)
!1278 = distinct !DILocation(line: 541, column: 3, scope: !1260, inlinedAt: !1267)
!1279 = !DILocalVariable(name: "__first", arg: 1, scope: !1280, file: !1114, line: 497, type: !423)
!1280 = distinct !DISubprogram(name: "__copy_move_a2<false, const int *, int *>", linkageName: "_ZSt14__copy_move_a2ILb0EPKiPiET1_T0_S4_S3_", scope: !15, file: !1114, line: 497, type: !1270, scopeLine: 498, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, templateParams: !1275, retainedNodes: !1281, keyInstructions: true)
!1281 = !{!1279, !1282, !1283}
!1282 = !DILocalVariable(name: "__last", arg: 2, scope: !1280, file: !1114, line: 497, type: !423)
!1283 = !DILocalVariable(name: "__result", arg: 3, scope: !1280, file: !1114, line: 497, type: !39)
!1284 = !DILocation(line: 0, scope: !1280, inlinedAt: !1285)
!1285 = distinct !DILocation(line: 533, column: 14, scope: !1269, inlinedAt: !1278)
!1286 = !DILocalVariable(name: "__first", arg: 1, scope: !1287, file: !1114, line: 433, type: !423)
!1287 = distinct !DISubprogram(name: "__copy_m<const int, int>", linkageName: "_ZNSt11__copy_moveILb0ELb1ESt26random_access_iterator_tagE8__copy_mIKiiEEPT0_PT_S7_S5_", scope: !1288, file: !1114, line: 433, type: !1270, scopeLine: 434, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, templateParams: !1293, declaration: !1292, retainedNodes: !1296, keyInstructions: true)
!1288 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "__copy_move<false, true, std::random_access_iterator_tag>", scope: !15, file: !1114, line: 428, size: 8, flags: DIFlagTypePassByValue, elements: !138, templateParams: !1289, identifier: "_ZTSSt11__copy_moveILb0ELb1ESt26random_access_iterator_tagE")
!1289 = !{!1265, !1290, !1291}
!1290 = !DITemplateValueParameter(name: "_IsSimple", type: !131, value: i1 true)
!1291 = !DITemplateTypeParameter(name: "_Category", type: !1128)
!1292 = !DISubprogram(name: "__copy_m<const int, int>", linkageName: "_ZNSt11__copy_moveILb0ELb1ESt26random_access_iterator_tagE8__copy_mIKiiEEPT0_PT_S7_S5_", scope: !1288, file: !1114, line: 433, type: !1270, scopeLine: 433, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: DISPFlagOptimized, templateParams: !1293)
!1293 = !{!1294, !1295}
!1294 = !DITemplateTypeParameter(name: "_Tp", type: !424)
!1295 = !DITemplateTypeParameter(name: "_Up", type: !40)
!1296 = !{!1286, !1297, !1298, !1299}
!1297 = !DILocalVariable(name: "__last", arg: 2, scope: !1287, file: !1114, line: 433, type: !423)
!1298 = !DILocalVariable(name: "__result", arg: 3, scope: !1287, file: !1114, line: 433, type: !39)
!1299 = !DILocalVariable(name: "_Num", scope: !1287, file: !1114, line: 435, type: !1300)
!1300 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !401)
!1301 = !DILocation(line: 0, scope: !1287, inlinedAt: !1302)
!1302 = distinct !DILocation(line: 505, column: 14, scope: !1280, inlinedAt: !1285)
!1303 = !DILocation(line: 438, column: 18, scope: !1304, inlinedAt: !1302, atomGroup: 21, atomRank: 1)
!1304 = distinct !DILexicalBlock(scope: !1305, file: !1114, line: 438, column: 13)
!1305 = distinct !DILexicalBlock(scope: !1287, file: !1114, line: 436, column: 8)
!1306 = !DILocation(line: 134, column: 27, scope: !1307, inlinedAt: !1033)
!1307 = distinct !DILexicalBlock(scope: !860, file: !50, line: 134, column: 6)
!1308 = !DILocation(line: 134, column: 6, scope: !1307, inlinedAt: !1033, atomGroup: 1, atomRank: 1)
!1309 = !{!"branch_weights", !"expected", i32 1, i32 2000}
!1310 = !DILocation(line: 139, column: 8, scope: !1311, inlinedAt: !1033)
!1311 = distinct !DILexicalBlock(scope: !1312, file: !50, line: 138, column: 10)
!1312 = distinct !DILexicalBlock(scope: !1307, file: !50, line: 135, column: 4)
!1313 = !DILocation(line: 151, column: 27, scope: !860, inlinedAt: !1033, atomGroup: 3, atomRank: 2)
!1314 = !DILocation(line: 400, column: 59, scope: !881, inlinedAt: !1037, atomGroup: 3, atomRank: 2)
!1315 = !DILocation(line: 436, column: 30, scope: !1305, inlinedAt: !1302)
!1316 = !DILocation(line: 436, column: 8, scope: !1305, inlinedAt: !1302, atomGroup: 2, atomRank: 1)
!1317 = !{!"branch_weights", !"expected", i32 -2147483648, i32 0}
!1318 = !DILocation(line: 437, column: 6, scope: !1305, inlinedAt: !1302, atomGroup: 3, atomRank: 1)
!1319 = !DILocation(line: 437, column: 6, scope: !1305, inlinedAt: !1302)
!1320 = !DILocation(line: 438, column: 18, scope: !1304, inlinedAt: !1302, atomGroup: 4, atomRank: 2)
!1321 = !DILocation(line: 438, column: 18, scope: !1304, inlinedAt: !1302, atomGroup: 4, atomRank: 1)
!1322 = !DILocalVariable(name: "__to", arg: 1, scope: !1323, file: !1114, line: 397, type: !39)
!1323 = distinct !DISubprogram(name: "__assign_one<int, const int>", linkageName: "_ZNSt11__copy_moveILb0ELb0ESt26random_access_iterator_tagE12__assign_oneIiKiEEvPT_PT0_", scope: !1324, file: !1114, line: 397, type: !1327, scopeLine: 398, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagDefinition | DISPFlagOptimized, unit: !8, templateParams: !1330, declaration: !1329, retainedNodes: !1332, keyInstructions: true)
!1324 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "__copy_move<false, false, std::random_access_iterator_tag>", scope: !15, file: !1114, line: 378, size: 8, flags: DIFlagTypePassByValue, elements: !138, templateParams: !1325, identifier: "_ZTSSt11__copy_moveILb0ELb0ESt26random_access_iterator_tagE")
!1325 = !{!1265, !1326, !1291}
!1326 = !DITemplateValueParameter(name: "_IsSimple", type: !131, value: i1 false)
!1327 = !DISubroutineType(types: !1328)
!1328 = !{null, !39, !423}
!1329 = !DISubprogram(name: "__assign_one<int, const int>", linkageName: "_ZNSt11__copy_moveILb0ELb0ESt26random_access_iterator_tagE12__assign_oneIiKiEEvPT_PT0_", scope: !1324, file: !1114, line: 397, type: !1327, scopeLine: 397, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: DISPFlagOptimized, templateParams: !1330)
!1330 = !{!82, !1331}
!1331 = !DITemplateTypeParameter(name: "_Up", type: !424)
!1332 = !{!1322, !1333}
!1333 = !DILocalVariable(name: "__from", arg: 2, scope: !1323, file: !1114, line: 397, type: !423)
!1334 = !DILocation(line: 0, scope: !1323, inlinedAt: !1335)
!1335 = distinct !DILocation(line: 439, column: 6, scope: !1304, inlinedAt: !1302)
!1336 = !DILocation(line: 398, column: 12, scope: !1323, inlinedAt: !1335, atomGroup: 1, atomRank: 2)
!1337 = !DILocation(line: 398, column: 10, scope: !1323, inlinedAt: !1335, atomGroup: 1, atomRank: 1)
!1338 = !DILocation(line: 439, column: 6, scope: !1304, inlinedAt: !1302)
!1339 = !DILocation(line: 12, column: 8, scope: !815, inlinedAt: !824, atomGroup: 1, atomRank: 1)
!1340 = !DILocation(line: 0, scope: !961, inlinedAt: !974)
!1341 = !DILocation(line: 0, scope: !1182, inlinedAt: !1342)
!1342 = distinct !DILocation(line: 168, column: 33, scope: !1013, inlinedAt: !974)
!1343 = !DILocation(line: 0, scope: !704, inlinedAt: !1344)
!1344 = distinct !DILocation(line: 155, column: 36, scope: !697, inlinedAt: !1345)
!1345 = distinct !DILocation(line: 338, column: 7, scope: !690, inlinedAt: !1346)
!1346 = distinct !DILocation(line: 620, column: 7, scope: !683, inlinedAt: !1347)
!1347 = distinct !DILocation(line: 12, column: 8, scope: !671, inlinedAt: !1348)
!1348 = distinct !DILocation(line: 40, column: 16, scope: !1349, inlinedAt: !1362)
!1349 = distinct !DISubprogram(name: "operator()", linkageName: "_ZZ7advance3EnviENK3$_0clE3Boxi", scope: !737, file: !9, line: 34, type: !1350, scopeLine: 34, flags: DIFlagPrototyped | DIFlagAllCallsDescribed, spFlags: DISPFlagLocalToUnit | DISPFlagDefinition | DISPFlagOptimized, unit: !8, declaration: !1354, retainedNodes: !1355, keyInstructions: true)
!1350 = !DISubroutineType(types: !1351)
!1351 = !{!11, !1352, !11, !40}
!1352 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !1353, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!1353 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !737)
!1354 = !DISubprogram(name: "operator()", scope: !737, file: !9, line: 34, type: !1350, scopeLine: 34, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagLocalToUnit | DISPFlagOptimized)
!1355 = !{!1356, !1358, !1359, !1360}
!1356 = !DILocalVariable(name: "this", arg: 1, scope: !1349, type: !1357, flags: DIFlagArtificial | DIFlagObjectPointer)
!1357 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !1353, size: 64)
!1358 = !DILocalVariable(name: "acc", arg: 2, scope: !1349, file: !9, line: 34, type: !11)
!1359 = !DILocalVariable(name: "layer", arg: 3, scope: !1349, file: !9, line: 34, type: !40)
!1360 = !DILocalVariable(name: "bucket", scope: !1349, file: !9, line: 35, type: !1361)
!1361 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !615, size: 64)
!1362 = distinct !DILocation(line: 169, column: 11, scope: !1013, inlinedAt: !974)
!1363 = !DILocation(line: 0, scope: !697, inlinedAt: !1345)
!1364 = !DILocation(line: 0, scope: !690, inlinedAt: !1346)
!1365 = !DILocation(line: 0, scope: !683, inlinedAt: !1347)
!1366 = !DILocation(line: 0, scope: !671, inlinedAt: !1348)
!1367 = !DILocation(line: 0, scope: !1201, inlinedAt: !1368)
!1368 = distinct !DILocation(line: 168, column: 22, scope: !1013, inlinedAt: !974)
!1369 = !DILocation(line: 168, column: 7, scope: !1014, inlinedAt: !974, atomGroup: 17, atomRank: 1)
!1370 = !DILocation(line: 106, column: 17, scope: !704, inlinedAt: !1008, atomGroup: 1, atomRank: 2)
!1371 = !DILocation(line: 0, scope: !1349, inlinedAt: !1362)
!1372 = !DILocation(line: 169, column: 52, scope: !1013, inlinedAt: !974)
!1373 = !{!1374}
!1374 = distinct !{!1374, !1375, !"_ZSt10accumulateIN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEE3BoxZ7advance3EnviE3$_0ET0_T_SB_SA_T1_: argument 0"}
!1375 = distinct !{!1375, !"_ZSt10accumulateIN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEE3BoxZ7advance3EnviE3$_0ET0_T_SB_SA_T1_"}
!1376 = !DILocation(line: 36, column: 23, scope: !1377, inlinedAt: !1362, atomGroup: 2, atomRank: 2)
!1377 = distinct !DILexicalBlock(scope: !1349, file: !9, line: 36, column: 13)
!1378 = !DILocation(line: 0, scope: !1377, inlinedAt: !1362)
!1379 = !DILocation(line: 1111, column: 2, scope: !1182, inlinedAt: !1342, atomGroup: 1, atomRank: 2)
!1380 = !DILocation(line: 1203, column: 27, scope: !1201, inlinedAt: !1368, atomGroup: 1, atomRank: 2)
!1381 = !DILocation(line: 168, column: 7, scope: !1014, inlinedAt: !974, atomGroup: 2, atomRank: 1)
!1382 = distinct !{!1382, !1383, !1384, !1215}
!1383 = !DILocation(line: 168, column: 7, scope: !1014, inlinedAt: !974)
!1384 = !DILocation(line: 169, column: 60, scope: !1014, inlinedAt: !974)
!1385 = !DILocation(line: 42, column: 3, scope: !723)
!1386 = !DILocation(line: 106, column: 4, scope: !704, inlinedAt: !946, atomGroup: 1, atomRank: 1)
!1387 = !DILocation(line: 106, column: 28, scope: !704, inlinedAt: !946)
!1388 = !DILocation(line: 106, column: 28, scope: !704, inlinedAt: !946, atomGroup: 2, atomRank: 1)
!1389 = !DILocation(line: 107, column: 4, scope: !704, inlinedAt: !946)
!1390 = !DILocation(line: 107, column: 4, scope: !704, inlinedAt: !946, atomGroup: 3, atomRank: 1)
!1391 = !DILocation(line: 12, column: 8, scope: !671, inlinedAt: !950)
!1392 = !DILocation(line: 12, column: 8, scope: !671, inlinedAt: !950, atomGroup: 1, atomRank: 1)
!1393 = !DILocation(line: 42, column: 15, scope: !723)
!1394 = !DILocation(line: 0, scope: !777, inlinedAt: !1395)
!1395 = distinct !DILocation(line: 42, column: 15, scope: !723)
!1396 = !DILocation(line: 0, scope: !772, inlinedAt: !1397)
!1397 = distinct !DILocation(line: 12, column: 8, scope: !776, inlinedAt: !1395)
!1398 = !DILocation(line: 0, scope: !767, inlinedAt: !1399)
!1399 = distinct !DILocation(line: 738, column: 7, scope: !771, inlinedAt: !1397)
!1400 = !DILocation(line: 369, column: 24, scope: !766, inlinedAt: !1399)
!1401 = !DILocation(line: 0, scope: !760, inlinedAt: !1402)
!1402 = distinct !DILocation(line: 369, column: 2, scope: !766, inlinedAt: !1399)
!1403 = !DILocation(line: 389, column: 6, scope: !759, inlinedAt: !1402, atomGroup: 1, atomRank: 2)
!1404 = !DILocation(line: 389, column: 6, scope: !759, inlinedAt: !1402, atomGroup: 1, atomRank: 1)
!1405 = !DILocation(line: 370, column: 17, scope: !766, inlinedAt: !1399)
!1406 = !DILocation(line: 370, column: 35, scope: !766, inlinedAt: !1399)
!1407 = !DILocation(line: 0, scope: !753, inlinedAt: !1408)
!1408 = distinct !DILocation(line: 390, column: 4, scope: !759, inlinedAt: !1402)
!1409 = !DILocation(line: 0, scope: !746, inlinedAt: !1410)
!1410 = distinct !DILocation(line: 517, column: 13, scope: !753, inlinedAt: !1408)
!1411 = !DILocation(line: 0, scope: !739, inlinedAt: !1412)
!1412 = distinct !DILocation(line: 210, column: 25, scope: !746, inlinedAt: !1410)
!1413 = !DILocation(line: 172, column: 2, scope: !739, inlinedAt: !1412)
!1414 = !DILocation(line: 390, column: 4, scope: !759, inlinedAt: !1402)
!1415 = !DILocation(line: 0, scope: !777, inlinedAt: !1416)
!1416 = distinct !DILocation(line: 45, column: 1, scope: !723)
!1417 = !DILocation(line: 0, scope: !772, inlinedAt: !1418)
!1418 = distinct !DILocation(line: 12, column: 8, scope: !776, inlinedAt: !1416)
!1419 = !DILocation(line: 0, scope: !767, inlinedAt: !1420)
!1420 = distinct !DILocation(line: 738, column: 7, scope: !771, inlinedAt: !1418)
!1421 = !DILocation(line: 369, column: 24, scope: !766, inlinedAt: !1420)
!1422 = !DILocation(line: 0, scope: !760, inlinedAt: !1423)
!1423 = distinct !DILocation(line: 369, column: 2, scope: !766, inlinedAt: !1420)
!1424 = !DILocation(line: 389, column: 6, scope: !759, inlinedAt: !1423, atomGroup: 1, atomRank: 2)
!1425 = !DILocation(line: 389, column: 6, scope: !759, inlinedAt: !1423, atomGroup: 1, atomRank: 1)
!1426 = !DILocation(line: 370, column: 17, scope: !766, inlinedAt: !1420)
!1427 = !DILocation(line: 370, column: 35, scope: !766, inlinedAt: !1420)
!1428 = !DILocation(line: 0, scope: !753, inlinedAt: !1429)
!1429 = distinct !DILocation(line: 390, column: 4, scope: !759, inlinedAt: !1423)
!1430 = !DILocation(line: 0, scope: !746, inlinedAt: !1431)
!1431 = distinct !DILocation(line: 517, column: 13, scope: !753, inlinedAt: !1429)
!1432 = !DILocation(line: 0, scope: !739, inlinedAt: !1433)
!1433 = distinct !DILocation(line: 210, column: 25, scope: !746, inlinedAt: !1431)
!1434 = !DILocation(line: 172, column: 2, scope: !739, inlinedAt: !1433)
!1435 = !DILocation(line: 390, column: 4, scope: !759, inlinedAt: !1423)
!1436 = !DILocation(line: 45, column: 1, scope: !723)
!1437 = !DILocation(line: 389, column: 6, scope: !759, inlinedAt: !851, atomGroup: 1, atomRank: 2)
!1438 = !DILocation(line: 389, column: 6, scope: !759, inlinedAt: !851, atomGroup: 1, atomRank: 1)
!1439 = !DILocation(line: 370, column: 35, scope: !766, inlinedAt: !852)
!1440 = !DILocation(line: 172, column: 2, scope: !739, inlinedAt: !848)
!1441 = !DILocation(line: 390, column: 4, scope: !759, inlinedAt: !851)
!1442 = !DILocation(line: 389, column: 6, scope: !759, inlinedAt: !794, atomGroup: 1, atomRank: 2)
!1443 = !DILocation(line: 389, column: 6, scope: !759, inlinedAt: !794, atomGroup: 1, atomRank: 1)
!1444 = !DILocation(line: 370, column: 35, scope: !766, inlinedAt: !795)
!1445 = !DILocation(line: 172, column: 2, scope: !739, inlinedAt: !791)
!1446 = !DILocation(line: 390, column: 4, scope: !759, inlinedAt: !794)
!1447 = !DILocation(line: 45, column: 1, scope: !723, atomGroup: 4, atomRank: 1)
!1448 = !DILocation(line: 30, column: 20, scope: !723)
!1449 = !DILocation(line: 389, column: 6, scope: !759, inlinedAt: !839, atomGroup: 1, atomRank: 2)
!1450 = !DILocation(line: 389, column: 6, scope: !759, inlinedAt: !839, atomGroup: 1, atomRank: 1)
!1451 = !DILocation(line: 172, column: 2, scope: !739, inlinedAt: !836)
!1452 = !DILocation(line: 390, column: 4, scope: !759, inlinedAt: !839)
!1453 = !DILocation(line: 389, column: 6, scope: !759, inlinedAt: !765, atomGroup: 1, atomRank: 2)
!1454 = !DILocation(line: 389, column: 6, scope: !759, inlinedAt: !765, atomGroup: 1, atomRank: 1)
!1455 = !DILocation(line: 370, column: 35, scope: !766, inlinedAt: !770)
!1456 = !DILocation(line: 172, column: 2, scope: !739, inlinedAt: !745)
!1457 = !DILocation(line: 390, column: 4, scope: !759, inlinedAt: !765)
!1458 = !DISubprogram(name: "operator new", linkageName: "_Znwm", scope: !1459, file: !1459, line: 126, type: !1460, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!1459 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/new", directory: "")
!1460 = !DISubroutineType(types: !1461)
!1461 = !{!622, !69}
!1462 = !DISubprogram(name: "operator delete", linkageName: "_ZdlPvm", scope: !1459, file: !1459, line: 135, type: !1463, flags: DIFlagPrototyped, spFlags: DISPFlagOptimized)
!1463 = !DISubroutineType(types: !1464)
!1464 = !{null, !622, !69}
